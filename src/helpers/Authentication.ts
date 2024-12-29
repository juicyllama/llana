import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Cache } from 'cache-manager'

import { CACHE_DEFAULT_IDENTITY_DATA_TTL, LLANA_PUBLIC_TABLES } from '../app.constants'
import { FindManyResponseObject } from '../dtos/response.dto'
import { Auth, AuthAPIKey, AuthLocation, AuthRestrictionsResponse, AuthType } from '../types/auth.types'
import { DataSourceFindOneOptions, QueryPerform, WhereOperator } from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'
import { Env } from '../utils/Env'
import { findDotNotation } from '../utils/Find'
import { commaStringToArray } from '../utils/String'
import { Logger } from './Logger'
import { Query } from './Query'
import { comparePermissions } from './Roles'
import { Schema } from './Schema'

/**
 * This service is responsible for handling authentication only, e.g. does the user have a valid API key or JWT token
 * It is not responsible for role permissions, e.g. does the user have permission to access a specific table
 */

@Injectable()
export class Authentication {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly jwtService: JwtService,
	) {}

	/**
	 * Check if the table is open to public access
	 */

	async public(options: {
		table: string
		access_level: RolePermission
		x_request_id?: string
	}): Promise<AuthRestrictionsResponse> {
		const auth_schema = await this.schema.getSchema({
			table: LLANA_PUBLIC_TABLES,
			x_request_id: options.x_request_id,
		})
		let public_access

		if (Env.IsNotTest()) {
			public_access = await this.cacheManager.get<FindManyResponseObject>(`auth:public`)
		}

		if (!public_access?.data) {
			public_access = (await this.query.perform(
				QueryPerform.FIND_MANY,
				{
					schema: auth_schema,
					limit: 99999,
				},
				options.x_request_id,
			)) as FindManyResponseObject

			await this.cacheManager.set(
				`auth:public`,
				public_access,
				this.configService.get('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_IDENTITY_DATA_TTL,
			)
		}

		if (public_access.data.length) {
			for (const record of public_access.data) {
				if (record.table === options.table) {
					//compare access level
					const access = comparePermissions(record.access_level, options.access_level)

					if (access) {
						return {
							valid: true,
							message: 'Public Access Granted',
							allowed_fields: commaStringToArray(record.allowed_fields),
						}
					}
				}
			}
		}

		return {
			valid: false,
			message: 'Private Access Only',
		}
	}

	/**
	 * Check is user is authorized to access system, optional pass in user_identifier for specific user check
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
	}): Promise<AuthRestrictionsResponse> {
		if (this.skipAuth()) {
			this.logger.debug(`[Authentication][auth] Skipping authentication due to SKIP_AUTH being true`)
			return { valid: true }
		}

		let auth_passed: AuthRestrictionsResponse = {
			valid: false,
			message: 'Unauthorized',
		}

		const authentications = this.configService.get<Auth[]>('auth')

		for (const auth of authentications) {
			if (auth_passed.valid) continue

			switch (auth.type) {
				case AuthType.APIKEY:
					auth_passed = await this.handleApiKeyAuth(auth, options)
					break

				case AuthType.JWT:
					auth_passed = await this.handleJwtAuth(options)
					break
			}
		}

		return auth_passed
	}

	private async handleApiKeyAuth(
		auth: Auth,
		options: {
			table: string
			headers?: any
			body?: any
			query?: any
			x_request_id?: string
		},
	): Promise<AuthRestrictionsResponse> {
		if (!auth.name) {
			return {
				valid: false,
				message: 'System configuration error: API key name required',
			}
		}

		if (!auth.location) {
			return {
				valid: false,
				message: 'System configuration error: API key location required',
			}
		}

		let req_api_key

		//Get the API key from the request
		switch (auth.location) {
			case AuthLocation.HEADER:
				if (!options.headers[auth.name]) {
					return {
						valid: false,
						message: `API key header ${auth.name} required`,
					}
				}
				req_api_key = options.headers[auth.name]
				break

			case AuthLocation.QUERY:
				if (!options.query[auth.name]) {
					return {
						valid: false,
						message: `API key query ${auth.name} required`,
					}
				}
				req_api_key = options.query[auth.name]
				break

			case AuthLocation.BODY:
				if (!options.body[auth.name]) {
					return {
						valid: false,
						message: `API key body ${auth.name} required`,
					}
				}
				req_api_key = options.body[auth.name]
				break
		}

		if (!req_api_key) {
			return {
				valid: false,
				message: 'API key required',
			}
		}

		if (Env.IsTest()) {
			this.logger.debug(`[Authentication][auth] Skipping API key check in test environment`)
			return {
				valid: true,
			}
		}

		const api_key_config = auth.table as AuthAPIKey

		if (!api_key_config || !api_key_config.name) {
			this.logger.error(
				`[Authentication][auth] System configuration error: API Key lookup table not found`,
				options.x_request_id,
			)
			return {
				valid: false,
				message: 'System configuration error: API Key lookup table not found',
			}
		}

		if (!api_key_config.column) {
			this.logger.error(
				`[Authentication][auth] System configuration error: API Key lookup column not found`,
				options.x_request_id,
			)
			return {
				valid: false,
				message: 'System configuration error: API Key lookup column not found',
			}
		}

		const schema = await this.schema.getSchema({ table: options.table, x_request_id: options.x_request_id })

		if (!schema) {
			this.logger.error(`[Authentication][auth] No schema found for table ${options.table}`, options.x_request_id)
			return { valid: false, message: `No Schema Found For Table ${options.table}` }
		}

		const identity_column = schema.primary_key

		let auth_result = await this.cacheManager.get(`auth:${auth.type}:${req_api_key}`)

		if (!auth_result) {
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
				return {
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

		return {
			valid: true,
			user_identifier: auth_result[identity_column],
		}
	}

	private async handleJwtAuth(options: {
		table: string
		headers?: any
		x_request_id?: string
	}): Promise<AuthRestrictionsResponse> {
		const authHeader = options.headers['Authorization'] || options.headers['authorization']

		if (!authHeader) {
			return {
				valid: false,
				message: 'Missing authorization header',
			}
		}

		const [bearer, jwt_token] = authHeader.split(' ')

		if (bearer !== 'Bearer' || !jwt_token) {
			return {
				valid: false,
				message: 'Invalid authorization format. Use: Bearer <token>',
			}
		}

		let payload

		try {
			payload = await this.jwtService.verifyAsync(jwt_token, {
				secret: this.configService.get('JWT_KEY'),
			})
		} catch (e) {
			this.logger.error(`[Authentication][auth] JWT verification failed: ${e.message}`)

			switch (e.message) {
				case 'jwt expired':
					return {
						valid: false,
						message: 'Access token expired',
					}
				default:
					return {
						valid: false,
						message: 'Authentication Failed',
					}
			}
		}

		if (!payload) {
			return {
				valid: false,
				message: 'Authentication Failed',
			}
		}

		this.logger.debug(`[Authentication][auth] JWT verification successful for user: ${payload.sub}`)

		return {
			valid: true,
			message: 'Authentication Successful',
			user_identifier: payload.sub,
		}
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
}
