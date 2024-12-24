import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Collection, Db, MongoClient, ObjectId } from 'mongodb'

import { LLANA_RELATION_TABLE } from '../app.constants'
import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
} from '../dtos/response.dto'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import {
	DataSourceColumnType,
	DataSourceCreateOneOptions,
	DataSourceDeleteOneOptions,
	DataSourceFindManyOptions,
	DataSourceFindOneOptions,
	DataSourceFindTotalRecords,
	DataSourceSchema,
	DataSourceSchemaColumn,
	DataSourceSchemaRelation,
	DataSourceType,
	DataSourceUniqueCheckOptions,
	DataSourceUpdateOneOptions,
	DataSourceWhere,
	WhereOperator,
} from '../types/datasource.types'

const DATABASE_TYPE = DataSourceType.MONGODB

@Injectable()
export class Mongo {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	async createConnection(
		table?: string,
	): Promise<{ collection: Collection<Document>; db: Db; connection: MongoClient }> {
		const result = {
			collection: null,
			db: null,
			connection: null,
		}

		try {
			if (!MongoClient) {
				throw new Error(`${DATABASE_TYPE} library is not initialized`)
			}

			const connectionString = this.configService.get('database.host').replace(/\/[^\/]*$/, '')
			const client = new MongoClient(connectionString)

			result.connection = await client.connect()

			const database = this.configService.get('database.host').split('/').pop()
			result.db = result.connection.db(database)

			if (table) {
				result.collection = result.db.collection(table)
			}

			return result
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error creating database connection - ${e.message}`)
			throw new Error('Error creating database connection')
		}
	}

	async checkConnection(options: { x_request_id?: string }): Promise<boolean> {
		try {
			await this.createConnection()
			return true
		} catch (e) {
			this.logger.error(
				`[${DATABASE_TYPE}] Error checking database connection - ${e.message}`,
				options.x_request_id,
			)
			return false
		}
	}

	/**
	 * List Tables
	 */

	async listTables(options: { x_request_id?: string }): Promise<string[]> {
		const mongo = await this.createConnection()

		try {
			this.logger.debug(`[${DATABASE_TYPE}] List Tables`, options.x_request_id)

			const collections = await mongo.db.listCollections().toArray()
			const tables = collections.map(c => c.name)

			mongo.connection.close()

			return tables
		} catch (e) {
			mongo.connection.close()
			this.logger.error(`[${DATABASE_TYPE}] Error listing tables - ${e.message}`)
			throw new Error(e)
		}
	}

	/**
	 * Get Table Schema
	 * @param repository
	 * @param table_name
	 */

	async getSchema(options: { table: string; x_request_id?: string }): Promise<DataSourceSchema> {
		const mongo = await this.createConnection(options.table)

		try {
			this.logger.debug(`[${DATABASE_TYPE}] Get Schema for collection ${options.table}`, options.x_request_id)

			const record = await mongo.collection.findOne({})

			if (!record) {
				throw new Error(`No record in collection ${options.table} to build schema`)
			}

			const relations: DataSourceSchemaRelation[] = []
			const columns = Object.keys(record).map(column => {
				return <DataSourceSchemaColumn>{
					field: column,
					type: this.fieldMapper(record[column]),
					nullable: true,
					required: false,
					primary_key: !!(column === '_id'),
					unique_key: false,
					foreign_key:
						typeof record[column] === 'object' &&
						column !== '_id' &&
						record[column] instanceof Date === false &&
						record[column] !== null,
					default: null,
					extra: null,
				}
			})

			this.logger.debug(`[${DATABASE_TYPE}] Auto build relations for collection ${options.table}`)

			for (const column of columns) {
				if (column.foreign_key) {
					const field_mongo = await this.createConnection(column.field)
					const record = await field_mongo.collection.findOne({})

					if (record) {
						relations.push({
							table: column.field,
							column: '_id',
							org_table: options.table,
							org_column: column.field,
						})

						this.logger.debug(
							`[${DATABASE_TYPE}] Auto found relation for collection ${options.table} to ${column.field}`,
						)
					}

					field_mongo.connection.close()
				}
			}

			this.logger.debug(
				`[${DATABASE_TYPE}] Looking for relations for collection ${options.table} in ${LLANA_RELATION_TABLE}`,
			)

			const relations_forward = await mongo.db
				.collection(LLANA_RELATION_TABLE)
				.find({ org_table: options.table })
				.toArray()

			for (const relation of relations_forward) {
				relations.push({
					table: relation.table,
					column: relation.column,
					org_table: relation.org_table,
					org_column: relation.org_column,
				})
			}

			const relations_back = await mongo.db
				.collection(LLANA_RELATION_TABLE)
				.find({ table: options.table })
				.toArray()

			for (const relation of relations_back) {
				relations.push({
					table: relation.org_table,
					column: relation.org_column,
					org_table: relation.table,
					org_column: relation.column,
				})
			}

			this.logger.debug(
				`[${DATABASE_TYPE}] Relations built for collection ${options.table}, relations: ${JSON.stringify(relations.map(r => r.table))}`,
			)

			mongo.connection.close()

			const schema = {
				table: options.table,
				columns,
				primary_key: columns.find(column => column.primary_key)?.field,
				relations,
			}

			return schema
		} catch (e) {
			mongo.connection.close()
			this.logger.warn(`[${DATABASE_TYPE}] Error getting schema - ${e.message}`)
			throw new Error(e)
		}
	}

	/**
	 * Insert a record
	 */

	async createOne(options: DataSourceCreateOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		this.logger.debug(
			`[${DATABASE_TYPE}] Create Record on for collection ${options.schema.table}: ${JSON.stringify(options.data)}`,
			x_request_id,
		)

		const mongo = await this.createConnection(options.schema.table)

		options = this.pipeObjectToMongo(options) as DataSourceUpdateOneOptions

		try {
			const result = await mongo.collection.insertOne(options.data as any)
			this.logger.debug(`[${DATABASE_TYPE}] Results: ${JSON.stringify(result)} - ${x_request_id}`)
			mongo.connection.close()
			return await this.findOne(
				{
					schema: options.schema,
					where: [{ column: '_id', operator: WhereOperator.equals, value: result.insertedId }],
				},
				x_request_id,
			)
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.data,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Find single record
	 */

	async findOne(options: DataSourceFindOneOptions, x_request_id: string): Promise<FindOneResponseObject | undefined> {
		const mongo = await this.createConnection(options.schema.table)

		try {
			this.logger.debug(
				`[${DATABASE_TYPE}] Find Record on for collection ${options.schema.table}: ${JSON.stringify(options.where)}`,
				x_request_id,
			)
			const mongoFilters = await this.whereToFilter(options.where)

			let mongoFields = {}
			if (options.fields) {
				for (const field of options.fields) {
					mongoFields[field] = 1
				}
			}

			const result = await mongo.collection.find(mongoFilters).project(mongoFields).limit(1).toArray()

			if (options.fields?.length && !options.fields.includes(options.schema.primary_key)) {
				delete result[0][options.schema.primary_key]
			}

			this.logger.debug(`[${DATABASE_TYPE}] Result: ${JSON.stringify(result[0])}`, x_request_id)
			mongo.connection.close()
			return this.formatOutput(options, result[0])
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.where,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Find multiple records
	 */

	async findMany(options: DataSourceFindManyOptions, x_request_id: string): Promise<FindManyResponseObject> {
		const total = await this.findTotalRecords(options, x_request_id)

		const mongo = await this.createConnection(options.schema.table)

		let mongoFields = {}
		if (options.fields) {
			for (const field of options.fields) {
				mongoFields[field] = 1
			}
		}

		try {
			this.logger.debug(
				`[${DATABASE_TYPE}] Find Record on for collection ${options.schema.table}: ${JSON.stringify(options.where)}`,
				x_request_id,
			)

			// Sort
			let mongoSort = {}

			if (options.sort) {
				for (const s of options.sort) {
					mongoSort[s.column] = s.operator === 'ASC' ? 1 : -1
				}
			}

			if (!options.limit) {
				options.limit = this.configService.get<number>('database.defaults.limit') ?? 20
			}

			if (!options.offset) {
				options.offset = 0
			}

			const mongoFilters = await this.whereToFilter(options.where)
			const results = <any>(
				await mongo.collection
					.find(mongoFilters)
					.sort(mongoSort)
					.project(mongoFields)
					.limit(options.limit)
					.skip(options.offset)
					.toArray()
			)
			this.logger.debug(`[${DATABASE_TYPE}] Results: ${JSON.stringify(results)} - ${x_request_id}`)

			for (const r in results) {
				if (options.fields?.length && !options.fields.includes(options.schema.primary_key)) {
					delete results[r][options.schema.primary_key]
				}
			}

			mongo.connection.close()

			return {
				limit: options.limit,
				offset: options.offset,
				total,
				pagination: {
					total: results.length,
					page: {
						current: this.pagination.current(options.limit, options.offset),
						prev: this.pagination.previous(options.limit, options.offset),
						next: this.pagination.next(options.limit, options.offset, total),
						first: this.pagination.first(options.limit),
						last: this.pagination.last(options.limit, total),
					},
				},
				data: results,
			}
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.where,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Get total records with where conditions
	 */

	async findTotalRecords(options: DataSourceFindTotalRecords, x_request_id: string): Promise<number> {
		const mongo = await this.createConnection(options.schema.table)

		try {
			this.logger.debug(
				`[${DATABASE_TYPE}] Find Records for collection ${options.schema.table}: ${JSON.stringify(options.where)}`,
				x_request_id,
			)
			const mongoFilters = await this.whereToFilter(options.where)
			const total = Number(await mongo.collection.countDocuments(mongoFilters))
			this.logger.debug(`[${DATABASE_TYPE}] Total Records: ${total}`, x_request_id)
			mongo.connection.close()
			return total
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.where,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Update one records
	 */

	async updateOne(options: DataSourceUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		const mongo = await this.createConnection(options.schema.table)

		if (options.data['_id']) {
			delete options.data['_id']
		}

		options = this.pipeObjectToMongo(options) as DataSourceUpdateOneOptions

		try {
			this.logger.debug(
				`[${DATABASE_TYPE}] Update Record on for collection ${options.schema.table}: ${JSON.stringify(options.data)}`,
				x_request_id,
			)

			const mongoFilters = await this.whereToFilter([
				{ column: options.schema.primary_key, operator: WhereOperator.equals, value: options.id },
			])
			const result = await mongo.collection.updateOne(mongoFilters, { $set: options.data })
			this.logger.debug(`[${DATABASE_TYPE}] Result: ${JSON.stringify(result)}`, x_request_id)
			mongo.connection.close()
			return this.findOne(
				{
					schema: options.schema,
					where: [{ column: '_id', operator: WhereOperator.equals, value: options.id }],
				},
				x_request_id,
			)
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.data,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Delete single record
	 */

	async deleteOne(options: DataSourceDeleteOneOptions, x_request_id: string): Promise<DeleteResponseObject> {
		const mongo = await this.createConnection(options.schema.table)

		try {
			this.logger.debug(
				`[${DATABASE_TYPE}] Delete Record on for collection ${options.schema.table}: ${options.id}`,
				x_request_id,
			)

			let result

			if (options.softDelete) {
				result = await this.updateOne(
					{
						id: options.id,
						schema: options.schema,
						data: {
							[options.softDelete]: new Date().toISOString().slice(0, 19).replace('T', ' '),
						},
					},
					x_request_id,
				)
			} else {
				const mongoFilters = await this.whereToFilter([
					{ column: options.schema.primary_key, operator: WhereOperator.equals, value: options.id },
				])
				result = await mongo.collection.deleteOne(mongoFilters)
			}

			this.logger.debug(`[${DATABASE_TYPE}] Result: ${JSON.stringify(result)}`, x_request_id)
			mongo.connection.close()
			if (result) {
				return {
					deleted: 1,
				}
			}
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`, x_request_id)
			this.logger.warn({
				data: options.id,
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Create table from schema object
	 */

	async createTable(schema: DataSourceSchema, x_request_id?: string): Promise<boolean> {
		const mongo = await this.createConnection(schema.table)

		try {
			this.logger.debug(`[${DATABASE_TYPE}] Create collection ${schema.table} ${x_request_id ?? ''}`)

			//check if collection exists
			const collections = await mongo.db.listCollections().toArray()
			const exists = collections.find(c => c.name === schema.table)

			if (!exists) {
				await mongo.db.createCollection(schema.table)
				this.logger.debug(`[${DATABASE_TYPE}] Collection ${schema.table} created ${x_request_id ?? ''}`)
			}

			mongo.connection.close()
			return true
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query ${x_request_id ?? ''}`)
			this.logger.warn({
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
			return false
		}
	}

	async truncate(table: string): Promise<void> {
		const mongo = await this.createConnection(table)

		try {
			await mongo.collection.deleteMany({})
			mongo.connection.close()
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`)
			this.logger.warn({
				error: {
					message: e.message,
				},
			})
			mongo.connection.close()
		}
	}

	async uniqueCheck(options: DataSourceUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		this.logger.debug(`[${DATABASE_TYPE}] Unique Check not applicable: ${JSON.stringify(options)}`, x_request_id)

		return {
			valid: true,
		}
	}

	/**
	 * Convert a Llana DatabaseWhere to a Mongo FilterOperations object
	 */
	async whereToFilter(where: DataSourceWhere[]): Promise<any> {
		const filter = {}

		if (!where || where.length === 0) {
			return filter
		}

		for (const w of where) {
			//if column is _id, convert to mongo id object
			if (w.column === '_id') {
				//convert to mongo id
				w.value = new ObjectId(w.value)
			}

			switch (w.operator) {
				case WhereOperator.equals:
					filter[w.column] = {
						$eq: w.value,
					}
					break

				case WhereOperator.not_equals:
					filter[w.column] = {
						$ne: w.value,
					}
					break

				case WhereOperator.gt:
					filter[w.column] = {
						$gt: w.value,
					}
					break

				case WhereOperator.gte:
					filter[w.column] = {
						$gte: w.value,
					}
					break

				case WhereOperator.lt:
					filter[w.column] = {
						$lt: w.value,
					}
					break

				case WhereOperator.lte:
					filter[w.column] = {
						$lte: w.value,
					}
					break

				case WhereOperator.in:
					filter[w.column] = {
						$in: w.value,
					}
					break

				case WhereOperator.not_in:
					filter[w.column] = {
						$nin: w.value,
					}
					break

				case WhereOperator.like:
				case WhereOperator.search:
					filter[w.column] = {
						$regex: w.value + '*',
					}
					break

				case WhereOperator.not_like:
					filter[w.column] = {
						$not: {
							$regex: w.value + '*',
						},
					}

					break

				case WhereOperator.not_null:
					filter[w.column] = {
						$not: null,
					}
					break

				case WhereOperator.null:
					filter[w.column] = null
					break

				default:
					this.logger.warn(`[${DATABASE_TYPE}] Operator not supported: ${w.operator}`)

					filter[w.column] = {
						$eq: w.value,
					}
					break
			}
		}

		return filter
	}

	/**
	 * Convert a typeof to Llana DatabaseColumnType
	 */

	private fieldMapper(field: any): DataSourceColumnType {
		if (field === null) {
			return DataSourceColumnType.UNKNOWN
		}

		if (field instanceof Date) {
			return DataSourceColumnType.DATE
		}

		const type = typeof field

		switch (type) {
			case 'string':
				return DataSourceColumnType.STRING
			case 'number':
				return DataSourceColumnType.NUMBER
			case 'boolean':
				return DataSourceColumnType.BOOLEAN
			case 'object':
				return DataSourceColumnType.JSON
			default:
				return DataSourceColumnType.UNKNOWN
		}
	}

	private formatOutput(options: DataSourceFindOneOptions, data: { [key: string]: any }): object {
		for (const key in data) {
			const column = options.schema.columns.find(c => c.field === key)

			if (!column) {
				continue
			}

			data[key] = this.formatField(column.type, data[key])
		}

		return data
	}

	private formatField(type: DataSourceColumnType, value: any): any {
		if (value === null) {
			return null
		}

		switch (type) {
			case DataSourceColumnType.DATE:
				return new Date(value).toISOString()
			default:
				return value
		}
	}

	private pipeObjectToMongo(
		options: DataSourceCreateOneOptions | DataSourceUpdateOneOptions,
	): DataSourceCreateOneOptions | DataSourceUpdateOneOptions {
		// Convert Date to ISOString
		for (const column of options.schema.columns) {
			if (!options.data[column.field]) {
				continue
			}

			if (options.data[column.field] instanceof Date) {
				options.data[column.field] = options.data[column.field].toISOString()
			}
		}

		return options
	}
}
