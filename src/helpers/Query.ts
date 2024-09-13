import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MySQL } from '../databases/mysql.database'
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
import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
} from '../dtos/response.dto'
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
	) {}

	async perform(
		action: QueryPerform,
		options:
			| DatabaseCreateOneOptions
			| DatabaseFindOneOptions
			| DatabaseFindManyOptions
			| DatabaseUpdateOneOptions
			| DatabaseDeleteOneOptions
			| DatabaseUniqueCheckOptions,
		x_request_id?: string,
	): Promise<FindOneResponseObject | FindManyResponseObject | IsUniqueResponse | DeleteResponseObject> {
		const table_name = options.schema.table
		this.logger.debug(
			`[Query][${action.toUpperCase()}][${table_name}] Performing action: ${JSON.stringify(options)}`, x_request_id
		)

		try {
			let result

			switch (action) {
				case QueryPerform.CREATE:
					const createOptions = options as DatabaseCreateOneOptions
					createOptions.data = await this.identityOperationCheck(createOptions)
					result = await this.createOne(createOptions, x_request_id)
					return this.schema.pipeResponse(options, result)
				case QueryPerform.FIND:
					const findOptions = options as DatabaseFindOneOptions
					result = await this.findOne(findOptions, x_request_id)
					if (!result) {
						return null
					}
					return this.schema.pipeResponse(options as DatabaseFindOneOptions, result)
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
					return this.schema.pipeResponse(options, result)
				case QueryPerform.DELETE:
					return await this.deleteOne(options as DatabaseDeleteOneOptions, x_request_id)
				case QueryPerform.UNIQUE:
					return await this.isUnique(options as DatabaseUniqueCheckOptions, x_request_id)
				default:
					this.logger.error(
						`[Query] Action ${action} not supported`, x_request_id
					)
					throw new Error(`Action ${action} not supported`)
			}
		} catch (e) {
			this.logger.error(
				`[Query][${action.toUpperCase()}][${table_name}] ${e.message}`, x_request_id
			)

			let pluralAction

			switch (action) {
				case QueryPerform.CREATE:
					pluralAction = 'creating record'
					break
				case QueryPerform.FIND:
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

	async createTable(schema: DatabaseSchema): Promise<boolean> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.createTable(schema)
			default:
				this.logger.error(
					`Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Insert a record
	 */

	private async createOne(options: DatabaseCreateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				result = await this.mysql.createOne(options, x_request_id)
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`, x_request_id
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
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`, x_request_id
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
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`, x_request_id
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
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`, x_request_id
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
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`, x_request_id
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
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`, x_request_id
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

	async truncate(table_name: string, x_request_id?: string): Promise<void> {
		if (Env.IsProd()) {
			throw new Error('Truncate not allowed in production')
		}

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.truncate(table_name)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`, x_request_id
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
}
