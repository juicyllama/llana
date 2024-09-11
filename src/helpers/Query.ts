import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MySQL } from '../databases/mysql.database'
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
} from '../types/response.types'
import { Env } from '../utils/Env'
import { Logger } from './Logger'
import { Schema } from './Schema'

@Injectable()
export class Query {
	constructor(
		private readonly configService: ConfigService,
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
	): Promise<FindOneResponseObject | FindManyResponseObject | IsUniqueResponse | DeleteResponseObject> {
		const table_name = options.schema.table
		this.logger.debug(`[Query][${action}][${table_name}]`, options)

		try {
			let result

			switch (action) {
				case QueryPerform.CREATE:
					result = await this.createOne(options as DatabaseCreateOneOptions)
					return this.schema.pipeResponse(options.schema, result)
				case QueryPerform.FIND:
					result = await this.findOne(options as DatabaseFindOneOptions)
					if (!result) {
						return {}
					}
					return this.schema.pipeResponse(options.schema, result)
				case QueryPerform.FIND_MANY:
					result = await this.findMany(options as DatabaseFindManyOptions)
					for (let i = 0; i < result.data.length; i++) {
						result.data[i] = await this.schema.pipeResponse(options.schema, result.data[i])
					}
					return result
				case QueryPerform.UPDATE:
					result = await this.updateOne(options as DatabaseUpdateOneOptions)
					return this.schema.pipeResponse(options.schema, result)
				case QueryPerform.DELETE:
					return await this.deleteOne(options as DatabaseDeleteOneOptions)
				case QueryPerform.UNIQUE:
					return await this.isUnique(options as DatabaseUniqueCheckOptions)
				default:
					this.logger.error(`[Query] Action ${action} not supported`)
					throw new Error(`Action ${action} not supported`)
			}
		} catch (e) {
			this.logger.error(`[Query][${action}][${table_name}] ${e.message}`)

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
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Insert a record
	 */

	private async createOne(options: DatabaseCreateOneOptions): Promise<FindOneResponseObject> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.createOne(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Find single record
	 */

	private async findOne(options: DatabaseFindOneOptions): Promise<FindOneResponseObject> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.findOne(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Find multiple records
	 */

	private async findMany(options: DatabaseFindManyOptions): Promise<FindManyResponseObject> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.findMany(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Update a record
	 */

	private async updateOne(options: DatabaseUpdateOneOptions): Promise<FindOneResponseObject> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.updateOne(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Delete a record
	 */

	private async deleteOne(options: DatabaseDeleteOneOptions): Promise<DeleteResponseObject> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.deleteOne(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Check uniqueness of record
	 */

	private async isUnique(options: DatabaseUniqueCheckOptions): Promise<IsUniqueResponse> {
		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.uniqueCheck(options)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Truncate a table - used for testing only, not for production
	 */

	async truncate(table_name: string): Promise<void> {
		if (Env.IsProd()) {
			throw new Error('Truncate not allowed in production')
		}

		switch (this.configService.get<string>('database.type')) {
			case DatabaseType.MYSQL:
				return await this.mysql.truncate(table_name)
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}
}
