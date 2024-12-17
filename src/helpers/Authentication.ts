import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Cache } from 'cache-manager'

import { CACHE_DEFAULT_IDENTITY_DATA_TTL, LLANA_AUTH_TABLE } from '../app.constants'
import { FindManyResponseObject } from '../dtos/response.dto'
import { Auth, AuthAPIKey, AuthLocation, AuthRestrictionsResponse, AuthType } from '../types/auth.types'
import { DataSourceFindOneOptions, DataSourceSchema, QueryPerform, WhereOperator } from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'
import { Env } from '../utils/Env'
import { findDotNotation } from '../utils/Find'
import { Logger } from './Logger'
import { Query } from './Query'
import { Roles } from './Roles'
import { Schema } from './Schema'

@Injectable()
export class Authentication {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly jwtService: JwtService,
		private readonly roles: Roles,
	) {}

	/**
	 * Helper to check if we are skipping authentication
	 */

	skipAuth(): boolean {
		const skipAuth = this.configService.get('SKIP_AUTH')
		// Only skip if explicitly set to 'true' string
		const shouldSkip = skipAuth === 'true'
		if (shouldSkip) {
			this.logger.debug(`[Authentication][auth] Skipping authentication due to SKIP_AUTH being true`)
		}
		return shouldSkip
	}

	/**
	 * Check is user is authorized to access a table, optional pass in user_identifier for specific user check
	 * @param schema
	 */

	async auth(options: {
		table: string
		access: RolePermission
		headers?: any
		body?: any
		query?: any
		x_request_id?: string
		user_identifier?: string | number
		skip_table_checks?: boolean
	}): Promise<AuthRestrictionsResponse> {
		if (this.skipAuth()) {
			this.logger.debug(`[Authentication][auth] Skipping authentication due to SKIP_AUTH being true`)
			return { valid: true }
		}

		// Check if table exists first
		
		if(!options.skip_table_checks){
			try {
				await this.schema.getSchema({ table: options.table, x_request_id: options.x_request_id })
			} catch (error) {
				this.logger.debug(`[Authentication][auth] Schema error: ${error.message}`)
				return { valid: false, message: `No Schema Found For Table ${options.table}` }
			}
		}

			const authentications = this.configService.get<Auth[]>('auth')
			const auth_schema = await this.schema.getSchema({ table: LLANA_AUTH_TABLE, x_request_id: options.x_request_id })

			let auth_passed: AuthRestrictionsResponse = {
				valid: false,
				message: 'Unauthorized',
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

			let rules = await this.cacheManager.get<FindManyResponseObject>(`auth:rules:${auth.type}`)

			if (!rules?.data) {
				rules = (await this.query.perform(
					QueryPerform.FIND_MANY,
					{
						schema: auth_schema,
						where: [
							{
								column: 'auth',
								operator: WhereOperator.equals,
								value: auth.type,
							},
						],
					},
					options.x_request_id,
				)) as FindManyResponseObject

				await this.cacheManager.set(
					`auth:rules:${auth.type}`,
					rules,
					this.configService.get('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_IDENTITY_DATA_TTL,
				)
			}

			if(!options.skip_table_checks){

				const excludes = rules.data.filter(rule => rule.type === 'EXCLUDE')
				const includes = rules.data.filter(rule => rule.type === 'INCLUDE')

				if (excludes?.length > 0) {
					for (const exclude of excludes) {
						if (options.table === exclude.table) {
							// Initialize rule object if it doesn't exist
							if (!exclude.rule) {
								exclude.rule = {}
							}
							if (!exclude.rule.public_records) {
								exclude.rule.public_records = RolePermission.READ
							}

							// For excluded tables, READ access follows public_records setting
							if (options.access === RolePermission.READ) {
								if (this.roles.rolePass(exclude.rule.public_records, options.access)) {
									check_required = false
									auth_passed = {
										valid: true,
										message: 'Public Access Granted',
									}
								} else {
									check_required = true
								}
							} else {
								// For non-READ operations on excluded tables, require authentication
								const authHeader = options.headers['Authorization'] || options.headers['authorization']
								this.logger.debug(`[Authentication][auth] Auth header for write operation: ${authHeader}`)

								if (!authHeader) {
									return {
										valid: false,
										message: 'JWT Authentication Required',
									}
								}

								try {
									const token = authHeader.replace(/^Bearer\s+/i, '') // Case-insensitive Bearer prefix removal
									this.logger.debug(
										`[Authentication][auth] Attempting JWT verification with token: ${token}`,
									)
									const payload = await this.jwtService.verifyAsync(token, {
										secret: this.configService.get('jwt.secret'),
										...this.configService.get('jwt.signOptions'),
									})
									if (payload) {
										this.logger.debug(
											`[Authentication][auth] JWT verification successful for excluded table write operation: ${JSON.stringify(payload)}`,
										)
										auth_passed = {
											valid: true,
											message: 'JWT Authentication Successful',
										}
										return auth_passed
									}
								} catch (error) {
									this.logger.debug(`[Authentication][auth] JWT verification failed: ${error.message}`)
									return {
										valid: false,
										message: 'JWT Authentication Failed',
									}
								}
							}
							check_required = false
						}
					}
				}

				if (includes) {
					for (const include of includes) {
						if (options.table.includes(include.table)) {
							check_required = true
						}
					}
				}

			}

			if (!check_required) continue

			if (options.user_identifier) {
				return {
					valid: true,
					user_identifier: options.user_identifier.toString(),
				}
			}

			let schema: DataSourceSchema | null = null
			let identity_column: string | null = null

			if(!options.skip_table_checks){

				try {
					schema = await this.schema.getSchema({ table: options.table, x_request_id: options.x_request_id })
					if (!schema) {
						this.logger.error(
							`[Authentication][auth] No schema found for table ${options.table}`,
							options.x_request_id,
						)
						return { valid: false, message: `No Schema Found For Table ${options.table}` }
					}
				} catch (e) {
					this.logger.error(
						`[Authentication][auth] Error getting schema for table ${options.table} - ${e.message}`,
						options.x_request_id,
					)
					return { valid: false, message: `No Schema Found For Table ${options.table}` }
				}

				if (auth?.table?.identity_column) {
					identity_column = auth.table.identity_column
				} else if (schema?.primary_key) {
					identity_column = schema.primary_key
				} else {
					this.logger.debug(`[Authentication][auth] No identity column found for table ${options.table}`)
					return { valid: false, message: `No identity column found for table ${options.table}` }
				}

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
							if (!options.headers[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key header ${auth.name} required`,
								}
								continue
							}
							req_api_key = options.headers[auth.name]
							break

						case AuthLocation.QUERY:
							if (!options.query[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key query ${auth.name} required`,
								}
								continue
							}
							req_api_key = options.query[auth.name]
							break

						case AuthLocation.BODY:
							if (!options.body[auth.name]) {
								auth_passed = {
									valid: false,
									message: `API key body ${auth.name} required`,
								}
								continue
							}
							req_api_key = options.body[auth.name]
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
							options.x_request_id,
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
							options.x_request_id,
						)
						auth_passed = {
							valid: false,
							message: 'System configuration error: API Key lookup column not found',
						}
						continue
					}

					let auth_result = await this.cacheManager.get(`auth:${auth.type}:${req_api_key}`)

					if (!auth_result || !auth_result[identity_column]) {
						const db_options: DataSourceFindOneOptions = {
							schema,
							fields: [identity_column],
							where: [
								{
									column: api_key_config.column,
									operator: WhereOperator.equals,
									value: req_api_key,
								},
							],
							relations: [],
						}

						const { valid, message, fields, relations } = await this.schema.validateFields({
							schema,
							fields: [api_key_config.column],
							x_request_id: options.x_request_id,
						})
						if (!valid) {
							auth_passed = {
								valid: false,
								message,
							}
						}

						for (const field of fields) {
							if (!db_options.fields.includes(field)) {
								db_options.fields.push(field)
							}
						}

						for (const relation of relations) {
							if (!db_options.relations.find(r => r.table === relation.table)) {
								db_options.relations.push(relation)
							}
						}

						if (this.configService.get('database.deletes.soft')) {
							db_options.where.push({
								column: this.configService.get('database.deletes.soft'),
								operator: WhereOperator.null,
							})
						}

						auth_result = await this.query.perform(QueryPerform.FIND_ONE, db_options, options.x_request_id)
						await this.cacheManager.set(
							`auth:${auth.type}:${req_api_key}`,
							auth_result,
							this.configService.get('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_IDENTITY_DATA_TTL,
						)
					}

					if (!auth_result) {
						this.logger.debug(
							`[Authentication][auth] API key not found - ${JSON.stringify({
								key: req_api_key,
								column: api_key_config.column,
								auth_result,
							})}`,
							options.x_request_id,
						)
						return { valid: false, message: 'Unauthorized' }
					}

					//key does not match - return unauthorized immediately
					if (
						!auth_result[api_key_config.column] &&
						findDotNotation(auth_result, api_key_config.column) !== req_api_key
					) {
						this.logger.debug(
							`[Authentication][auth] API key not found ${JSON.stringify({
								key: req_api_key,
								column: api_key_config.column,
								auth_result,
							})}`,
							options.x_request_id,
						)
						return { valid: false, message: 'Unauthorized' }
					}

					if (!auth_result[identity_column]) {
						this.logger.error(
							`[Authentication][auth] Identity column ${identity_column} not found in result - ${JSON.stringify(auth_result)}`,
							options.x_request_id,
						)
						return {
							valid: false,
							message: `System configuration error: Identity column ${identity_column} not found`,
						}
					}

					this.logger.debug(
						`[Authentication][auth] User #${auth_result[identity_column]} identified successfully`,
						options.x_request_id,
					)

					auth_passed = {
						valid: true,
						user_identifier: auth_result[identity_column],
					}

					break

				case AuthType.JWT:
					const authHeader = options.headers['Authorization'] || options.headers['authorization']
					if (!authHeader) {
						auth_passed = {
							valid: false,
							message: 'Authentication Failed',
						}
						continue
					}

					const [bearer, jwt_token] = authHeader.split(' ')
					if (bearer !== 'Bearer' || !jwt_token) {
						auth_passed = {
							valid: false,
							message: 'Invalid authorization format. Use: Bearer <token>',
						}
						continue
					}

					try {
						const payload = await this.jwtService.verifyAsync(jwt_token, {
							secret: this.configService.get('JWT_KEY'),
						})

						if (!payload) {
							auth_passed = {
								valid: false,
								message: 'Authentication Failed',
							}
							continue
						}

						this.logger.debug(`[Authentication][auth] JWT verification successful for user: ${payload.sub}`)

						// Check for excluded tables first
						const excludeRule = rules.data.find(
							rule => rule.type === 'EXCLUDE' && rule.table === options.table,
						)

						if (excludeRule) {
							// For READ operations, follow public_records setting
							if (options.access === RolePermission.READ) {
								if (!excludeRule.rule.public_records) {
									excludeRule.rule.public_records = RolePermission.READ
								}
								if (this.roles.rolePass(excludeRule.rule.public_records, options.access)) {
									return {
										valid: true,
										message: 'Public access allowed',
									}
								}
							}
							// For WRITE operations on excluded tables, allow if JWT is valid
							return {
								valid: true,
								message: 'Authentication Successful',
								user_identifier: payload.sub,
							}
						}

						// For non-excluded tables or if no specific rule matched
						auth_passed = {
							valid: true,
							message: 'Authentication Successful',
							user_identifier: payload.sub,
						}
					} catch (error) {
						this.logger.debug(`[Authentication][auth] JWT verification error: ${error.message}`)
						auth_passed = {
							valid: false,
							message: 'Authentication Failed',
						}
					}

					continue
			}
		}

		return auth_passed
	}

	getIdentityTable(): string {
		return this.configService.get<string>('AUTH_USER_TABLE_NAME') ?? 'User'
	}

	async getIdentityColumn(x_request_id?: string): Promise<string> {
		if (this.configService.get<string>('AUTH_USER_IDENTITY_COLUMN')) {
			return this.configService.get<string>('AUTH_USER_IDENTITY_COLUMN')
		} else {
			const schema = await this.schema.getSchema({ table: this.getIdentityTable(), x_request_id })
			return schema.primary_key
		}
	}
}
