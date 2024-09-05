import { Env } from '../utils/Env'
import { Injectable, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { Auth, AuthAPIKey, AuthLocation, AuthRestrictionsResponse, AuthType } from '../types/auth.types'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Authentication {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly jwtService: JwtService,
	) {}

	/**
	 * Create entity schema from database schema
	 * @param schema
	 */

	async auth(@Req() req): Promise<AuthRestrictionsResponse> {
		const authentications = this.configService.get<Auth[]>('auth')

		if (!authentications) {
			return {
				valid: true,
			}
		}

		let auth_passed: AuthRestrictionsResponse = {
			valid: false,
			message: 'Unathorized',
		}

		for (const auth of authentications) {
			if (auth_passed.valid) continue

			if (!auth.type) {
				auth_passed = {
					valid: false,
					message: 'System configuration error: Restriction type required',
				}
				continue
			}

			//Is the restriction required on the current route?
			let check_required = true

			if (auth.routes?.exclude) {
				for (const exclude of auth.routes.exclude) {
					if (req.originalUrl.includes(exclude)) {
						check_required = false
					}

					if (exclude.includes('*')) {
						if (req.originalUrl.includes(exclude.split('*')[0])) {
							check_required = false
						}
					}

					if (exclude === '*') {
						check_required = false
					}
				}
			}

			if (auth.routes?.include) {
				for (const include of auth.routes.include) {
					if (req.originalUrl.includes(include)) {
						check_required = true
					}

					if (include.includes('*')) {
						if (req.originalUrl.includes(include.split('*')[0])) {
							check_required = true
						}
					}

					if (include === '*') {
						check_required = true
					}
				}
			}

			if (!check_required) continue

			let identity_column
			let schema: DatabaseSchema

			try {
				schema = await this.schema.getSchema(auth.table.name)
			} catch (e) {
				this.logger.error(`[Authentication][auth] Table ${auth.table.name} not found`, { e })
				return { valid: false, message: `No Schema Found For Table ${auth.table.name}` }
			}

			if (auth.table.identity_column) {
				identity_column = auth.table.identity_column
			} else {
				identity_column = schema.primary_key
			}

			switch (auth.type) {
				case AuthType.APIKEY:
					if (!auth.name) {
						auth_passed = {
							valid: false,
							message: 'System configuration error: API key name required',
						}
						continue
					}

					if (!auth.location) {
						auth_passed = {
							valid: false,
							message: 'System configuration error: API key location required',
						}
						continue
					}

					let req_api_key

					switch (auth.location) {
						case AuthLocation.HEADER:
							if (!req.headers[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key header ${auth.name} required`,
								}
								continue
							}
							req_api_key = req.headers[auth.name]
							break

						case AuthLocation.QUERY:
							if (!req.query[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key query ${auth.name} required`,
								}
								continue
							}
							req_api_key = req.query[auth.name]
							break

						case AuthLocation.BODY:
							if (!req.body[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key body ${auth.name} required`,
								}
								continue
							}
							req_api_key = req.body[auth.name]
							break
					}

					if (!req_api_key) {
						auth_passed = {
							valid: false,
							message: 'API key required',
						}
						continue
					}

					if (Env.IsTest()) {
						this.logger.debug(`[Authentication][auth] Skipping API key check in test environment`)
						auth_passed = {
							valid: true,
						}
						continue
					}

					const api_key_config = auth.table as AuthAPIKey

					if (!api_key_config || !api_key_config.name) {
						this.logger.error(
							`[Authentication][auth] System configuration error: API Key lookup table not found`,
						)
						auth_passed = {
							valid: false,
							message: 'System configuration error: API Key lookup table not found',
						}
						continue
					}

					if (!api_key_config.column) {
						this.logger.error(
							`[Authentication][auth] System configuration error: API Key lookup column not found`,
						)
						auth_passed = {
							valid: false,
							message: 'System configuration error: API Key lookup column not found',
						}
						continue
					}

					const relations = api_key_config.column.includes('.') ? [api_key_config.column.split('.')[0]] : []

					if (relations.length > 0) {
						const validateRelations = await this.schema.validateRelations(schema, relations)
						if (!validateRelations.valid) {
							this.logger.error(validateRelations.message)
							return validateRelations
						}

						schema = validateRelations.schema
					}

					const result = await this.query.perform(QueryPerform.FIND, {
						schema,
						relations,
						fields: [`${api_key_config.name}.${identity_column}`, api_key_config.column],
						where: [
							{
								column: api_key_config.column,
								operator: WhereOperator.equals,
								value: req_api_key,
							},
						],
						joins: true,
					})

					let column

					if (api_key_config.column.includes('.')) {
						column = api_key_config.column.split('.')[1]
					} else {
						column = api_key_config.column
					}

					//key does not match - return unauthorized immediately
					if (!result || !result[column] || result[column] !== req_api_key) {
						this.logger.debug(`[Authentication][auth] API key not found`, {
							key: req_api_key,
							column,
							result,
						})
						return { valid: false, message: 'Unathorized' }
					}

					if (!result[identity_column]) {
						this.logger.error(
							`[Authentication][auth] Identity column ${identity_column} not found in result`,
							{ result },
						)
						return {
							valid: false,
							message: `System configuration error: Identity column ${identity_column} not found`,
						}
					}

					this.logger.debug(`[Authentication][auth] User #${result[identity_column]} identified successfully`)

					auth_passed = {
						valid: true,
						user_identifier: result[identity_column],
					}

					break

				case AuthType.JWT:
					const jwt_token = req.headers['authorization']?.split(' ')[1]

					if (!jwt_token) {
						auth_passed = {
							valid: false,
							message: 'JWT token required',
						}
						continue
					}

					const jwt_config = this.configService.get<any>('jwt')

					try {
						const payload = await this.jwtService.verifyAsync(jwt_token, {
							secret: jwt_config.secret,
						})

						auth_passed = {
							valid: true,
							user_identifier: payload.sub,
						}
					} catch {
						auth_passed = {
							valid: false,
							message: 'JWT Authentication Failed',
						}
					}

					continue
			}
		}

		return auth_passed
	}
}
