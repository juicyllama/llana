import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Mongo } from '../databases/mongo.database'
import { MySQL } from '../databases/mysql.database'
import { Postgres } from '../databases/postgres.database'
import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
	ListTablesResponseObject,
} from '../dtos/response.dto'
import { AuthType } from '../types/auth.types'
import {
	DatabaseCreateOneOptions,
	DatabaseDeleteOneOptions,
	DatabaseFindManyOptions,
	DatabaseFindOneOptions,
	DatabaseSchema,
	DatabaseType,
	DatabaseUniqueCheckOptions,
	DatabaseUpdateOneOptions,
	QueryPerform,
} from '../types/database.types'
import { Env } from '../utils/Env'
import { Encryption } from './Encryption'
import { Logger } from './Logger'
import { Schema } from './Schema'

@Injectable()
export class Query {
	constructor(
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
		private readonly logger: Logger,
		private readonly schema: Schema,
		private readonly mysql: MySQL,
		private readonly postgres: Postgres,
		private readonly mongo: Mongo,
	) {}

	async perform(
		action: QueryPerform,
		options?:
			| DatabaseCreateOneOptions
			| DatabaseFindOneOptions
			| DatabaseFindManyOptions
			| DatabaseUpdateOneOptions
			| DatabaseDeleteOneOptions
			| DatabaseUniqueCheckOptions,
		x_request_id?: string,
	): Promise<
		| FindOneResponseObject
		| FindManyResponseObject
		| IsUniqueResponse
		| DeleteResponseObject
		| void
		| boolean
		| ListTablesResponseObject
	> {
		let table_name

		if (
			[
				QueryPerform.CREATE,
				QueryPerform.CREATE_TABLE,
				QueryPerform.DELETE,
				QueryPerform.FIND_MANY,
				QueryPerform.FIND_ONE,
				QueryPerform.TRUNCATE,
				QueryPerform.UNIQUE,
				QueryPerform.UPDATE,
			].includes(action)
		) {
			if (!options.schema?.table) {
				this.logger.warn(
					`[Query][${action.toUpperCase()}] Table not defined in schema: ${JSON.stringify(options)} ${x_request_id ?? ''}`,
				)
				throw new Error('Table not defined')
			}

			table_name = options.schema.table
			this.logger.debug(
				`[Query][${action.toUpperCase()}][${table_name}] Performing action: ${JSON.stringify(options)} ${x_request_id ?? ''}`,
			)
		}

		try {
			let result

			switch (action) {
				case QueryPerform.CREATE:
					const createOptions = options as DatabaseCreateOneOptions
					createOptions.data = await this.identityOperationCheck(createOptions)
					result = await this.createOne(createOptions, x_request_id)
					return await this.schema.pipeResponse(options, result)

				case QueryPerform.FIND_ONE:
					const findOptions = options as DatabaseFindOneOptions
					result = await this.findOne(findOptions, x_request_id)
					if (!result) {
						return null
					}
					return await this.schema.pipeResponse(options as DatabaseFindOneOptions, result)

				case QueryPerform.FIND_MANY:
					const findManyOptions = options as DatabaseFindManyOptions
					result = await this.findMany(findManyOptions, x_request_id)
					for (let i = 0; i < result.data.length; i++) {
						result.data[i] = await this.schema.pipeResponse(findManyOptions, result.data[i])
					}
					return result

				case QueryPerform.UPDATE:
					const updateOptions = options as DatabaseUpdateOneOptions
					updateOptions.data = await this.identityOperationCheck(updateOptions)
					result = await this.updateOne(updateOptions, x_request_id)
					return await this.schema.pipeResponse(options, result)

				case QueryPerform.DELETE:
					return await this.deleteOne(options as DatabaseDeleteOneOptions, x_request_id)

				case QueryPerform.UNIQUE:
					return await this.isUnique(options as DatabaseUniqueCheckOptions, x_request_id)

				case QueryPerform.TRUNCATE:
					return await this.truncate(options.schema.table, x_request_id)

				case QueryPerform.CREATE_TABLE:
					return await this.createTable(options.schema)

				case QueryPerform.CHECK_CONNECTION:
					return await this.checkConnection({ x_request_id })

				case QueryPerform.LIST_TABLES:
					return await this.listTables({ x_request_id })

				default:
					this.logger.error(`[Query] Action ${action} not supported`, x_request_id)
					throw new Error(`Action ${action} not supported`)
			}
		} catch (e) {
			this.logger.error(`[Query][${action.toUpperCase()}][${table_name}] ${e.message} ${x_request_id ?? ''}`)

			let pluralAction

			switch (action) {
				case QueryPerform.CREATE:
					pluralAction = 'creating record'
					break
				case QueryPerform.FIND_ONE:
					pluralAction = 'finding record'
					break
				case QueryPerform.FIND_MANY:
					pluralAction = 'finding records'
					break
				case QueryPerform.UPDATE:
					pluralAction = 'updating record'
					break
				case QueryPerform.DELETE:
					pluralAction = 'deleting record'
					break
				case QueryPerform.UNIQUE:
					pluralAction = 'checking uniqueness'
					break
				default:
					pluralAction = 'performing action'
					break
			}

			throw new Error(`Error ${pluralAction}`)
		}
	}

	/**
	 * Create a table
	 *
	 * * Used as part of the setup process
	 */

	private async createTable(schema: DatabaseSchema): Promise<boolean> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.createTable(schema)
			case DatabaseType.POSTGRES:
				return await this.postgres.createTable(schema)
			case DatabaseType.MONGODB:
				return await this.mongo.createTable(schema)
			default:
				this.logger.error(`Database type ${this.configService.get<string>('database.type')} not supported yet`)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Insert a record
	 */

	private async createOne(options: DatabaseCreateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<DatabaseType>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.createOne(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.createOne(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.createOne(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			...result,
			x_request_id,
		}
	}

	/**
	 * Find single record
	 */

	private async findOne(options: DatabaseFindOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.findOne(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.findOne(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.findOne(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		if (!result) {
			return null
		}

		return {
			...result,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Find multiple records
	 */

	private async findMany(options: DatabaseFindManyOptions, x_request_id: string): Promise<FindManyResponseObject> {
		let result: FindManyResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.findMany(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.findMany(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.findMany(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			...result,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Update a record
	 */

	private async updateOne(options: DatabaseUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.updateOne(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.updateOne(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.updateOne(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			...result,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Delete a record
	 */

	private async deleteOne(options: DatabaseDeleteOneOptions, x_request_id: string): Promise<DeleteResponseObject> {
		let result: DeleteResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.deleteOne(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.deleteOne(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.deleteOne(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`,
					x_request_id,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			...result,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Check uniqueness of record
	 */

	private async isUnique(options: DatabaseUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		let result: IsUniqueResponse

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.uniqueCheck(options, x_request_id)
				break
			case DatabaseType.POSTGRES:
				result = await this.postgres.uniqueCheck(options, x_request_id)
				break
			case DatabaseType.MONGODB:
				result = await this.mongo.uniqueCheck(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			...result,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Truncate a table - used for testing only, not for production
	 */

	private async truncate(table_name: string, x_request_id?: string): Promise<void> {
		if (Env.IsProd()) {
			throw new Error('Truncate not allowed in production')
		}

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.truncate(table_name)
			case DatabaseType.POSTGRES:
				return await this.postgres.truncate(table_name)
			case DatabaseType.MONGODB:
				return await this.mongo.truncate(table_name)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * If the table is the user identity table, hash the password
	 */

	private async identityOperationCheck(options: DatabaseCreateOneOptions | DatabaseUpdateOneOptions): Promise<any> {
		const jwt_config = this.configService.get<any>('auth').find(auth => auth.type === AuthType.JWT)

		if (options.data[jwt_config.table.columns.password]) {
			if (options.schema.table === jwt_config.table.name) {
				options.data[jwt_config.table.columns.password] = await this.encryption.encrypt(
					jwt_config.table.password.encryption,
					options.data[jwt_config.table.columns.password],
					jwt_config.table.password.salt,
				)
			}
		}

		return options.data
	}

	/**
	 * Check if connection is alive
	 */

	private async checkConnection(options: { x_request_id?: string }): Promise<boolean> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.checkConnection({ x_request_id: options.x_request_id })
			case DatabaseType.POSTGRES:
				return await this.postgres.checkConnection({ x_request_id: options.x_request_id })
			case DatabaseType.MONGODB:
				return await this.mongo.checkConnection({ x_request_id: options.x_request_id })
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${options.x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * List tables in the database
	 */

	private async listTables(options: { x_request_id?: string }): Promise<ListTablesResponseObject> {
		let tables: string[]

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				tables = await this.mysql.listTables({ x_request_id: options.x_request_id })
				break
			case DatabaseType.POSTGRES:
				tables = await this.postgres.listTables({ x_request_id: options.x_request_id })
				break
			case DatabaseType.MONGODB:
				tables = await this.mongo.listTables({ x_request_id: options.x_request_id })
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet ${options.x_request_id ?? ''}`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		return {
			tables: tables.filter(table => !table.startsWith('_llana_')),
			_x_request_id: options.x_request_id,
		}
	}
}
