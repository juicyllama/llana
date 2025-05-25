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
	DataSourceRelations,
	DataSourceSchema,
	DataSourceSchemaRelation,
	DataSourceType,
	DataSourceUniqueCheckOptions,
	DataSourceUpdateOneOptions,
	DataSourceWhere,
	QueryPerform,
	WhereOperator,
} from '../types/datasource.types'
import { Env } from '../utils/Env'
import { CircuitBreaker } from './CircuitBreaker'
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
		private readonly mssql: MSSQL,
		private readonly postgres: Postgres,
		private readonly mongo: Mongo,
		private readonly airtable: Airtable,
		private readonly circuitBreaker: CircuitBreaker,
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
			if (!this.circuitBreaker.isAllowed()) {
				this.logger.error(
					`[Query][${action.toUpperCase()}] Circuit breaker open, rejecting request`,
					x_request_id,
				)
				throw new Error('Database circuit breaker open, please try again later')
			}

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

				case QueryPerform.RESET_SEQUENCES:
					return await this.resetSequences(x_request_id)

				case QueryPerform.LIST_TABLES:
					return await this.listTables(options as DataSourceListTablesOptions, x_request_id)

				default:
					this.logger.error(`[Query] Action ${action} not supported`, x_request_id)
					throw new Error(`Action ${action} not supported`)
			}
		} catch (e) {
			this.circuitBreaker.reportFailure()
			this.logger.error(`[Query][${action.toUpperCase()}][${table_name}] ${e.message}`, x_request_id)

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

		this.circuitBreaker.reportSuccess()
	}

	/**
	 * Converts a URL request to an DataSourceFindManyOptions object (used for cache requests)
	 */

	async buildFindManyOptionsFromRequest(options: {
		request: any
		schema: DataSourceSchema
	}): Promise<DataSourceFindManyOptions> {
		if (!options.request || !options.schema) {
			this.logger.error('[Query][buildFindManyOptionsFromRequest] Request or Schema not provided')
			return
		}

		try {
			const searchRequest = new URLSearchParams(options.request)
			const request = Object.fromEntries(searchRequest.entries())

			let sort

			if (request['sort']) {
				// Validate sort format: column.direction
				if (!request['sort'].includes('.')) {
					this.logger.warn(`Invalid sort format: ${request['sort']}. Expected format: column.direction`)
					// Continue with no sorting
				} else {
					const sortItems = request['sort'].split('.')

					sort = [
						{
							column: sortItems[0],
							operator: sortItems[1] === 'desc' ? 'DESC' : 'ASC',
						},
					]
				}
			}

			let fields

			if (request['fields']) {
				// if it's an array, join it
				if (Array.isArray(request['fields'])) {
					fields = request['fields']
				}
				// if it's a string, convert it to an array
				else if (typeof request['fields'] === 'string') {
					fields = request['fields'].split(',')
				}
			}

			let relations: DataSourceRelations[] = []

			if (request['relations']) {
				let relationsArray

				if (Array.isArray(request['relations'])) {
					relationsArray = request['relations']
				}
				// if it's a string, convert it to an array
				else if (typeof request['relations'] === 'string') {
					relationsArray = request['relations'].split(',')
				}

				// convert relations to DataSourceSchemaRelation[]

				for (const relation of relationsArray) {
					const relationFields = []

					if (fields) {
						for (const field of fields) {
							if (field.startsWith(relation)) {
								relationFields.push(field.replace(relation + '.', ''))
							}
						}
					}

					const relationSchema = await this.schema.getSchema({ table: relation })

					let join

					if (options.schema.relations.find(col => col.table === relation)) {
						join = options.schema.relations.find(col => col.table === relation)
					} else if (options.schema.relations.find(col => col.org_table === relation)) {
						join = options.schema.relations.find(col => col.org_table === relation)
					} else {
						this.logger.error(`Relation ${relation} not found in schema ${options.schema.table}`)
					}

					relations.push({
						table: relation,
						join,
						schema: relationSchema,
						columns: relationFields,
					})
				}
			}

			let where: DataSourceWhere[] = []

			for (const key in request) {
				if (key === 'sort' || key === 'fields' || key === 'relations' || key === 'limit' || key === 'offset') {
					continue
				}

				//convert format from id=1, id[gt]=1, id[lt]=1, id[gte]=1, id[lte]=1,
				// id[not_like]=value, id[not_in]=value, id[null], id[not_null],
				// handle[search]=value, handle[like]=value, handle[in]=value to DataSourceWhere[]
				// Using a regex to handle multiple brackets correctly

				const matches = key.match(/\[(.*?)\]/)
				const operator = matches ? WhereOperator[matches[1]] : WhereOperator.equals

				where.push({
					column: key.split('[')[0],
					operator: operator as WhereOperator,
					value: request[key],
				})
			}

			let topLevelFields = []

			if (fields) {
				topLevelFields = fields.filter(field => !field.includes('.'))
			}

			const findManyOptions: DataSourceFindManyOptions = {
				schema: options.schema,
				fields: topLevelFields,
				where,
				relations,
				limit: Number(request['limit']) || 20,
				offset: Number(request['offset']) || 0,
				sort,
			}

			return findManyOptions
		} catch (e) {
			this.logger.error(`[Query][buildFindManyOptionsFromRequest] Error: ${e.message}`, e.stack)
			throw new Error('Error building findMany options: ' + e.message)
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

		const resultCopy = { ...result }

		for (const relation of options.relations) {
			const rel = this.getTableRelationColumn(relation.join, options.schema.table)
			const relationTable = this.getChildTableRelation(relation.join, options.schema.table)

			if (!resultCopy[rel]) {
				throw new Error(
					`Cannot build relation. Field ${rel} not found in the result set. Please ensure you are selecting the column in your query`,
				)
			}

			const where: DataSourceWhere[] = [
				{
					column: relationTable.column,
					operator: WhereOperator.equals,
					value: resultCopy[rel],
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
				resultCopy[relation.table] =
					relationResults.total > 0
						? relationResults.data.map(item => {
								const cleanItem = { ...item }
								if (cleanItem[options.schema.table]) {
									delete cleanItem[options.schema.table]
								}
								return cleanItem
							})
						: []
			}
		}

		return resultCopy
	}

	/**
	 * Get a relation column from a relation table
	 */

	/**
	 * Reset database sequences (PostgreSQL only)
	 */
	private async resetSequences(x_request_id?: string): Promise<boolean> {
		if (this.configService.get<string>('database.type') === DataSourceType.POSTGRES) {
			return await this.postgres.resetSequences(x_request_id)
		}

		this.logger.debug(`[Query] Sequence reset is only supported for PostgreSQL databases`, x_request_id)
		return true
	}

	getTableRelationColumn(relation: DataSourceSchemaRelation, currentTable: string): string {
		if (relation.table === currentTable) {
			return relation.column
		}

		return relation.org_column
	}

	/**
	 * Get a "child" table relation from a relation
	 */

	getChildTableRelation(relation: DataSourceSchemaRelation, currentTable: string): { table: string; column: string } {
		if (relation.table === currentTable) {
			return {
				table: relation.org_table,
				column: relation.org_column,
			}
		}

		return {
			table: relation.table,
			column: relation.column,
		}
	}
}
