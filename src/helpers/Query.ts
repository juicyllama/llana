import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Airtable } from '../datasources/airtable.datasource'
import { Mongo } from '../datasources/mongo.datasource'
import { MSSQL } from '../datasources/mssql.datasource'
import { MySQL } from '../datasources/mysql.datasource'
import { Postgres } from '../datasources/postgres.datasource'
import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
	ListTablesResponseObject,
} from '../dtos/response.dto'
import { AuthType } from '../types/auth.types'
import {
	DataSourceCreateOneOptions,
	DataSourceDeleteOneOptions,
	DataSourceFindManyOptions,
	DataSourceFindOneOptions,
	DataSourceListTablesOptions,
	DataSourceSchema,
	DataSourceType,
	DataSourceUniqueCheckOptions,
	DataSourceUpdateOneOptions,
	DataSourceWhere,
	QueryPerform,
	WhereOperator,
} from '../types/datasource.types'
import { Env } from '../utils/Env'
import { Encryption } from './Encryption'
import { ErrorHandler } from './ErrorHandler'
import { Logger } from './Logger'
import { Schema } from './Schema'

@Injectable()
export class Query {
	constructor(
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly schema: Schema,
		private readonly encryption: Encryption,
		private readonly mysql: MySQL,
		private readonly mssql: MSSQL,
		private readonly postgres: Postgres,
		private readonly mongo: Mongo,
		private readonly airtable: Airtable,
		private readonly errorHandler: ErrorHandler,
	) {}

	async perform(
		action: QueryPerform,
		options?:
			| DataSourceCreateOneOptions
			| DataSourceFindOneOptions
			| DataSourceFindManyOptions
			| DataSourceUpdateOneOptions
			| DataSourceDeleteOneOptions
			| DataSourceUniqueCheckOptions
			| DataSourceListTablesOptions,
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
			if (!(options as any).schema?.table) {
				this.logger.warn(
					`[Query][${action.toUpperCase()}] Table not defined in schema: ${JSON.stringify(options)}`,
					x_request_id,
				)
				throw new Error('Table not defined')
			}

			table_name = (options as any).schema.table
		}

		try {
			let result

			switch (action) {
				case QueryPerform.CREATE:
					const createOptions = options as DataSourceCreateOneOptions
					createOptions.data = await this.identityOperationCheck(createOptions)
					result = await this.createOne(createOptions, x_request_id)
					return await this.schema.pipeResponse(createOptions, result)

				case QueryPerform.FIND_ONE:
					const findOptions = options as DataSourceFindOneOptions
					result = await this.findOne(findOptions, x_request_id)
					if (!result) {
						return null
					}

					result = await this.schema.pipeResponse(options as DataSourceFindOneOptions, result)
					return result

				case QueryPerform.FIND_MANY:
					const findManyOptions = options as DataSourceFindManyOptions
					result = await this.findMany(findManyOptions, x_request_id)

					for (let i = 0; i < result.data.length; i++) {
						result.data[i] = await this.schema.pipeResponse(findManyOptions, result.data[i])
					}
					return result

				case QueryPerform.UPDATE:
					const updateOptions = options as DataSourceUpdateOneOptions
					updateOptions.data = await this.identityOperationCheck(updateOptions)
					result = await this.updateOne(updateOptions, x_request_id)
					return await this.schema.pipeResponse(updateOptions, result)

				case QueryPerform.DELETE:
					return await this.deleteOne(options as DataSourceDeleteOneOptions, x_request_id)

				case QueryPerform.UNIQUE:
					return await this.isUnique(options as DataSourceUniqueCheckOptions, x_request_id)

				case QueryPerform.TRUNCATE:
					return await this.truncate((options as any).schema.table, x_request_id)

				case QueryPerform.CREATE_TABLE:
					return await this.createTable((options as any).schema, x_request_id)

				case QueryPerform.CHECK_CONNECTION:
					return await this.checkConnection({ x_request_id })

				case QueryPerform.LIST_TABLES:
					return await this.listTables(options as DataSourceListTablesOptions, x_request_id)

				default:
					this.logger.error(`[Query] Action ${action} not supported`, x_request_id)
					throw new Error(`Action ${action} not supported`)
			}
		} catch (e) {
			this.logger.error(`[Query][${action.toUpperCase()}][${table_name}] ${e.message}`, x_request_id)

			// Get datasource type from config
			const datasourceType =
				(this.configService.get<string>('database.type') as DataSourceType) || DataSourceType.POSTGRES

			// Use ErrorHandler to get descriptive error message
			const errorMessage = this.errorHandler.handleDatabaseError(e, datasourceType)

			const pluralAction = this.getActionDescription(action)
			throw new Error(`Error ${pluralAction}: ${errorMessage}`)
		}
	}

	private getActionDescription(action: QueryPerform): string {
		switch (action) {
			case QueryPerform.CREATE:
				return 'creating record'
			case QueryPerform.FIND_ONE:
				return 'finding record'
			case QueryPerform.FIND_MANY:
				return 'finding records'
			case QueryPerform.UPDATE:
				return 'updating record'
			case QueryPerform.DELETE:
				return 'deleting record'
			case QueryPerform.UNIQUE:
				return 'checking uniqueness'
			default:
				return 'performing action'
		}
	}

	/**
	 * Create a table
	 *
	 * * Used as part of the setup process
	 */

	private async createTable(schema: DataSourceSchema, x_request_id: string): Promise<boolean> {
		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				return await this.mysql.createTable(schema, x_request_id)
			case DataSourceType.POSTGRES:
				return await this.postgres.createTable(schema, x_request_id)
			case DataSourceType.MONGODB:
				return await this.mongo.createTable(schema, x_request_id)
			case DataSourceType.MSSQL:
				return await this.mssql.createTable(schema, x_request_id)
			case DataSourceType.AIRTABLE:
				return await this.airtable.createTable(schema, x_request_id)
			default:
				this.logger.error(`Database type ${this.configService.get<string>('database.type')} not supported yet`)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}
	}

	/**
	 * Insert a record
	 */

	private async createOne(options: DataSourceCreateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<DataSourceType>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.createOne(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.createOne(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.createOne(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.createOne(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.createOne(options, x_request_id)
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

	private async findOne(options: DataSourceFindOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.findOne(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.findOne(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.findOne(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.findOne(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.findOne(options, x_request_id)
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

	private async findMany(options: DataSourceFindManyOptions, x_request_id: string): Promise<FindManyResponseObject> {
		let result: FindManyResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.findMany(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.findMany(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.findMany(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.findMany(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.findMany(options, x_request_id)
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

	private async updateOne(options: DataSourceUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		let result: FindOneResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.updateOne(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.updateOne(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.updateOne(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.updateOne(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.updateOne(options, x_request_id)
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

	private async deleteOne(options: DataSourceDeleteOneOptions, x_request_id: string): Promise<DeleteResponseObject> {
		let result: DeleteResponseObject

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.deleteOne(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.deleteOne(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.deleteOne(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.deleteOne(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.deleteOne(options, x_request_id)
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

	private async isUnique(options: DataSourceUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		let result: IsUniqueResponse

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				result = await this.mysql.uniqueCheck(options, x_request_id)
				break
			case DataSourceType.POSTGRES:
				result = await this.postgres.uniqueCheck(options, x_request_id)
				break
			case DataSourceType.MONGODB:
				result = await this.mongo.uniqueCheck(options, x_request_id)
				break
			case DataSourceType.MSSQL:
				result = await this.mssql.uniqueCheck(options, x_request_id)
				break
			case DataSourceType.AIRTABLE:
				result = await this.airtable.uniqueCheck(options, x_request_id)
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
			case DataSourceType.MYSQL:
				return await this.mysql.truncate(table_name)
			case DataSourceType.POSTGRES:
				return await this.postgres.truncate(table_name)
			case DataSourceType.MONGODB:
				return await this.mongo.truncate(table_name)
			case DataSourceType.MSSQL:
				return await this.mssql.truncate(table_name)
			case DataSourceType.AIRTABLE:
				return await this.airtable.truncate(table_name)
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

	private async identityOperationCheck(
		options: DataSourceCreateOneOptions | DataSourceUpdateOneOptions,
	): Promise<any> {
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

	async getDatabaseType(): Promise<DataSourceType> {
		return (this.configService.get<string>('database.type') as DataSourceType) || DataSourceType.POSTGRES
	}

	private async checkConnection(options: { x_request_id?: string }): Promise<boolean> {
		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				return await this.mysql.checkDataSource({ x_request_id: options.x_request_id })
			case DataSourceType.POSTGRES:
				return await this.postgres.checkConnection({ x_request_id: options.x_request_id })
			case DataSourceType.MONGODB:
				return await this.mongo.checkConnection({ x_request_id: options.x_request_id })
			case DataSourceType.MSSQL:
				return await this.mssql.checkConnection({ x_request_id: options.x_request_id })
			case DataSourceType.AIRTABLE:
				return await this.airtable.checkConnection({ x_request_id: options.x_request_id })
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

	private async listTables(
		options: DataSourceListTablesOptions,
		x_request_id?: string,
	): Promise<ListTablesResponseObject> {
		let tables: string[]

		switch (this.configService.get<string>('database.type')) {
			case DataSourceType.MYSQL:
				tables = await this.mysql.listTables({ x_request_id })
				break
			case DataSourceType.POSTGRES:
				tables = await this.postgres.listTables({ x_request_id })
				break
			case DataSourceType.MONGODB:
				tables = await this.mongo.listTables({ x_request_id })
				break
			case DataSourceType.MSSQL:
				tables = await this.mssql.listTables({ x_request_id })
				break
			case DataSourceType.AIRTABLE:
				tables = await this.airtable.listTables({ x_request_id })
				break
			default:
				this.logger.error(
					`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
					x_request_id,
				)
				throw new Error(`Database type ${this.configService.get<string>('database.type')} not supported`)
		}

		let tables_filtered = tables

		if (!options?.include_system) {
			tables_filtered = tables_filtered.filter(table => !table.startsWith('_llana_'))
		}

		if (!options?.include_known_db_orchestration) {
			tables_filtered = tables_filtered.filter(table => table !== 'atlas_schema_revisions')
		}

		return {
			tables: tables_filtered,
			_x_request_id: x_request_id,
		}
	}

	/**
	 * Build relations
	 */
	async buildRelations(
		options: DataSourceFindOneOptions,
		result: FindOneResponseObject,
		x_request_id: string,
	): Promise<FindOneResponseObject> {
		if (!options.relations?.length) {
			return result
		}

		for (const relation of options.relations) {
			if (Array.isArray(result[relation.join.org_column])) {
				result[relation.join.org_column] = result[relation.join.org_column][0]
			}

			const where: DataSourceWhere[] = [
				{
					column: relation.join.column,
					operator: WhereOperator.equals,
					value: result[relation.join.org_column],
				},
			]

			if (relation.where) {
				where.push(relation.where)
			}

			if (this.configService.get('database.deletes.soft')) {
				where.push({
					column: this.configService.get('database.deletes.soft'),
					operator: WhereOperator.null,
				})
			}

			const relationOptions = <DataSourceFindManyOptions>{
				schema: relation.schema,
				fields: relation.columns,
				where: where,
				limit: 9999,
				offset: 0,
			}

			const relationResults = await this.findMany(relationOptions, x_request_id)

			if (relationResults) {
				result[relation.table] = relationResults.total > 0 ? relationResults.data : []
			}
		}

		return result
	}
}
