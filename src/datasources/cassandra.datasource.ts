import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, types } from 'cassandra-driver'

import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
} from '../dtos/response.dto'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import { DatabaseErrorType } from '../types/datasource.types'
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
	WhereOperator,
} from '../types/datasource.types'
import { CassandraColumnType, CassandraConnectionConfig } from '../types/datasources/cassandra.types'
import { SortCondition } from '../types/schema.types'
import { Env } from '../utils/Env'

const DATABASE_TYPE = DataSourceType.CASSANDRA

@Injectable()
export class Cassandra implements OnModuleInit, OnModuleDestroy {
	private client: Client

	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	async onModuleInit(): Promise<void> {
		if (Env.IsTest()) return

		const connectionUri = this.configService.get<string>('database.host')
		const config = this.parseConnectionString(connectionUri)

		this.client = new Client({
			contactPoints: config.contactPoints,
			localDataCenter: config.localDataCenter,
			keyspace: config.keyspace,
			credentials: config.username && config.password ? {
				username: config.username,
				password: config.password,
			} : undefined,
		})

		try {
			await this.client.connect()
			this.logger.log(`[${DATABASE_TYPE}] Cassandra connection established`)
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error connecting to Cassandra - ${e.message}`)
			throw new Error('Error connecting to Cassandra')
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (this.client) {
			await this.client.shutdown()
			this.logger.log(`[${DATABASE_TYPE}] Cassandra connection closed`)
		}
	}

	private parseConnectionString(uri: string): CassandraConnectionConfig {
		// Expected format: cassandra://username:password@host1,host2:port/keyspace?datacenter=dc1
		const url = new URL(uri)
		
		const contactPoints = url.hostname.split(',').map(host => host.trim())
		const port = url.port ? parseInt(url.port) : 9042
		const keyspace = url.pathname.replace('/', '') || undefined
		const localDataCenter = url.searchParams.get('datacenter') || 'datacenter1'

		return {
			contactPoints: contactPoints.map(host => `${host}:${port}`),
			localDataCenter,
			keyspace,
			username: url.username || undefined,
			password: url.password || undefined,
			port,
		}
	}

	async createConnection(): Promise<Client> {
		if (Env.IsTest()) {
			const connectionUri = this.configService.get<string>('database.host')
			const config = this.parseConnectionString(connectionUri)
			
			const testClient = new Client({
				contactPoints: config.contactPoints,
				localDataCenter: config.localDataCenter,
				keyspace: config.keyspace,
				credentials: config.username && config.password ? {
					username: config.username,
					password: config.password,
				} : undefined,
			})
			
			await testClient.connect()
			return testClient
		}

		if (!this.client) {
			throw new Error(`${DATABASE_TYPE} client is not initialized`)
		}

		return this.client
	}

	async checkConnection(options: { x_request_id?: string }): Promise<boolean> {
		try {
			const client = await this.createConnection()
			await client.execute('SELECT now() FROM system.local')
			return true
		} catch (e) {
			this.logger.error(
				`[${DATABASE_TYPE}] Error checking database connection - ${e.message}`,
				options.x_request_id,
			)
			return false
		}
	}

	async performQuery(options: { cql: string; params?: any[]; x_request_id?: string }): Promise<any> {
		const client = await this.createConnection()

		try {
			this.logger.verbose(
				`[${DATABASE_TYPE}] ${options.cql} ${options.params ? 'Params: ' + JSON.stringify(options.params) : ''} - ${options.x_request_id ?? ''}`,
			)

			const result = await client.execute(options.cql, options.params || [], { prepare: true })
			
			this.logger.verbose(
				`[${DATABASE_TYPE}] Results: ${result.rows.length} rows - ${options.x_request_id ?? ''}`,
			)

			if (Env.IsTest() && client !== this.client) {
				await client.shutdown()
			}

			return result.rows
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query - ${options.x_request_id ?? ''}`)
			this.logger.warn({
				cql: {
					cql: options.cql,
					params: options.params ?? [],
				},
				error: {
					message: e.message,
				},
			})

			if (Env.IsTest() && client !== this.client) {
				await client.shutdown()
			}

			throw new Error(e)
		}
	}

	/**
	 * List all tables in the keyspace
	 */
	async listTables(options: { x_request_id?: string }): Promise<string[]> {
		try {
			const keyspace = this.parseConnectionString(this.configService.get('database.host')).keyspace
			if (!keyspace) {
				throw new Error('Keyspace not specified in connection string')
			}

			const results = await this.performQuery({
				cql: 'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?',
				params: [keyspace],
				x_request_id: options.x_request_id,
			})

			const tables = results.map((row: any) => row.table_name)
			this.logger.debug(`[${DATABASE_TYPE}] Tables: ${tables}`, options.x_request_id)
			return tables
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error listing tables`, options.x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Get Table Schema
	 */
	async getSchema(options: { table: string; x_request_id?: string }): Promise<DataSourceSchema> {
		try {
			const keyspace = this.parseConnectionString(this.configService.get('database.host')).keyspace
			if (!keyspace) {
				throw new Error('Keyspace not specified in connection string')
			}

			const results = await this.performQuery({
				cql: `SELECT column_name, type, kind FROM system_schema.columns 
					  WHERE keyspace_name = ? AND table_name = ?`,
				params: [keyspace, options.table],
				x_request_id: options.x_request_id,
			})

			const columns: DataSourceSchemaColumn[] = results.map((row: any) => {
				const isPrimaryKey = row.kind === 'partition_key' || row.kind === 'clustering'
				
				return {
					field: row.column_name,
					type: this.mapCassandraTypeToDataSourceType(row.type),
					nullable: !isPrimaryKey, // Primary key columns are not nullable in Cassandra
					required: isPrimaryKey,
					primary_key: row.kind === 'partition_key',
					unique_key: isPrimaryKey,
					foreign_key: false, // Cassandra doesn't have foreign keys
					auto_increment: false, // Cassandra doesn't have auto-increment
					default: null,
					extra: { cassandra_type: row.type, kind: row.kind },
				}
			})

			// Find primary key - in Cassandra, partition key is the primary key
			const primaryKey = columns.find(col => col.primary_key)?.field || columns[0]?.field

			return {
				table: options.table,
				columns,
				primary_key: primaryKey,
				relations: [], // Cassandra doesn't support relations in the traditional sense
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error getting schema for table ${options.table}`, options.x_request_id)
			throw new Error(e)
		}
	}

	private mapCassandraTypeToDataSourceType(cassandraType: string): DataSourceColumnType {
		const type = cassandraType.toLowerCase()

		// Check collection types first (before checking for text/int inside them)
		if (type.includes('list') || type.includes('set') || type.includes('map')) {
			return DataSourceColumnType.JSON
		}
		if (type.includes('text') || type.includes('varchar') || type.includes('ascii')) {
			return DataSourceColumnType.STRING
		}
		if (type.includes('int') || type.includes('bigint') || type.includes('counter') || type.includes('varint')) {
			return DataSourceColumnType.NUMBER
		}
		if (type.includes('float') || type.includes('double') || type.includes('decimal')) {
			return DataSourceColumnType.NUMBER
		}
		if (type.includes('boolean')) {
			return DataSourceColumnType.BOOLEAN
		}
		if (type.includes('timestamp') || type.includes('date') || type.includes('time')) {
			return DataSourceColumnType.DATE
		}

		return DataSourceColumnType.UNKNOWN
	}

	/**
	 * Create table from schema object
	 */
	async createTable(schema: DataSourceSchema, x_request_id?: string): Promise<boolean> {
		try {
			this.logger.debug(`[${DATABASE_TYPE}] Creating table ${schema.table}`, x_request_id)

			// Check if table already exists
			const tables = await this.listTables({ x_request_id })
			if (tables.includes(schema.table)) {
				this.logger.debug(`[${DATABASE_TYPE}] Table ${schema.table} already exists`, x_request_id)
				return true
			}

			// Generate column definitions
			const columnDefinitions: string[] = []
			const secondaryIndexes: string[] = []
			let primaryKeyColumn = schema.primary_key

			for (const column of schema.columns) {
				let columnDef = `${column.field} ${this.mapDataSourceTypeToCassandraType(column)}`

				// Handle primary key - in Cassandra, we need to identify it for the PRIMARY KEY clause
				if (column.primary_key) {
					primaryKeyColumn = column.field
				}

				// For non-primary key columns that need to be queryable, we'll create secondary indexes
				if (!column.primary_key && (column.unique_key || column.field === 'email')) {
					secondaryIndexes.push(column.field)
				}

				columnDefinitions.push(columnDef)
			}

			// Build CREATE TABLE statement
			let cql = `CREATE TABLE IF NOT EXISTS ${schema.table} (`
			cql += columnDefinitions.join(', ')

			// Add PRIMARY KEY clause
			if (primaryKeyColumn) {
				cql += `, PRIMARY KEY (${primaryKeyColumn})`
			}

			cql += ')'

			// Execute table creation
			await this.performQuery({
				cql,
				params: [],
				x_request_id,
			})

			this.logger.debug(`[${DATABASE_TYPE}] Table ${schema.table} created successfully`, x_request_id)

			// Create secondary indexes for queryable columns
			for (const indexColumn of secondaryIndexes) {
				const indexName = `${schema.table}_${indexColumn}_idx`
				const indexCql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${schema.table} (${indexColumn})`

				try {
					await this.performQuery({
						cql: indexCql,
						params: [],
						x_request_id,
					})
					this.logger.debug(`[${DATABASE_TYPE}] Index ${indexName} created successfully`, x_request_id)
				} catch (indexError) {
					this.logger.warn(`[${DATABASE_TYPE}] Failed to create index ${indexName}: ${indexError.message}`, x_request_id)
					// Don't fail table creation if index creation fails
				}
			}

			return true
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error creating table ${schema.table}: ${e.message}`, x_request_id)
			return false
		}
	}

	/**
	 * Map DataSource column type to Cassandra CQL type
	 */
	private mapDataSourceTypeToCassandraType(column: DataSourceSchemaColumn): string {
		switch (column.type) {
			case DataSourceColumnType.STRING:
				return 'TEXT'
			case DataSourceColumnType.NUMBER:
				// For primary keys or auto-increment, use UUID
				if (column.primary_key || column.auto_increment) {
					return 'UUID'
				}
				// For decimal numbers
				if (column.extra && 'decimal' in column.extra && column.extra.decimal > 0) {
					return 'DECIMAL'
				}
				// Default to INT for whole numbers
				return 'INT'
			case DataSourceColumnType.BOOLEAN:
				return 'BOOLEAN'
			case DataSourceColumnType.DATE:
				return 'TIMESTAMP'
			case DataSourceColumnType.JSON:
				return 'TEXT' // Store JSON as text in Cassandra
			case DataSourceColumnType.ENUM:
				return 'TEXT' // Store enums as text in Cassandra
			default:
				return 'TEXT'
		}
	}

	/**
	 * Find Many Records
	 */
	async findMany(options: DataSourceFindManyOptions, x_request_id?: string): Promise<FindManyResponseObject> {
		try {
			const tableName = options.schema.table
			let cql = `SELECT * FROM ${tableName}`
			const params: any[] = []

			// Add WHERE conditions
			if (options.where && options.where.length > 0) {
				const whereConditions: string[] = []
				for (const whereClause of options.where) {
					switch (whereClause.operator) {
						case WhereOperator.equals:
							whereConditions.push(`${whereClause.column} = ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.not_equals:
							whereConditions.push(`${whereClause.column} != ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.gt:
							whereConditions.push(`${whereClause.column} > ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.gte:
							whereConditions.push(`${whereClause.column} >= ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.lt:
							whereConditions.push(`${whereClause.column} < ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.lte:
							whereConditions.push(`${whereClause.column} <= ?`)
							params.push(whereClause.value)
							break
						case WhereOperator.in:
							if (Array.isArray(whereClause.value)) {
								whereConditions.push(`${whereClause.column} IN (${whereClause.value.map(() => '?').join(', ')})`)
								params.push(...whereClause.value)
							}
							break
						case WhereOperator.like:
							whereConditions.push(`${whereClause.column} LIKE ?`)
							params.push(`%${whereClause.value}%`)
							break
					}
				}

				if (whereConditions.length > 0) {
					cql += ` WHERE ${whereConditions.join(' AND ')}`
				}
			}

			// Add ORDER BY
			if (options.sort && options.sort.length > 0) {
				const orderConditions: string[] = []
				for (const sortCondition of options.sort) {
					orderConditions.push(`${sortCondition.column} ${sortCondition.operator}`)
				}
				cql += ` ORDER BY ${orderConditions.join(', ')}`
			}

			// Add LIMIT
			if (options.limit) {
				cql += ` LIMIT ?`
				params.push(options.limit)
			}

			const results = await this.performQuery({
				cql,
				params,
				x_request_id,
			})

			const total = results.length // Cassandra doesn't provide total count efficiently
			const offset = options.offset || 0
			const limit = options.limit || results.length

			return {
				data: results,
				total,
				offset,
				limit,
				pagination: {
					total: results.length,
					page: {
						current: this.pagination.current(limit, offset),
						prev: this.pagination.previous(limit, offset),
						next: this.pagination.next(limit, offset, total),
						first: this.pagination.first(limit),
						last: this.pagination.last(limit, total),
					},
				},
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error finding many records`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Find One Record
	 */
	async findOne(options: DataSourceFindOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		try {
			const findManyOptions: DataSourceFindManyOptions = {
				...options,
				limit: 1,
			}

			const result = await this.findMany(findManyOptions, x_request_id)

			return {
				data: result.data.length > 0 ? result.data[0] : null,
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error finding one record`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Create One Record
	 */
	async createOne(options: DataSourceCreateOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		try {
			const tableName = options.schema.table
			const fields = Object.keys(options.data)
			const placeholders = fields.map(() => '?').join(', ')
			const values = Object.values(options.data)

			const cql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`

			await this.performQuery({
				cql,
				params: values,
				x_request_id,
			})

			// Return the created record
			return {
				data: options.data,
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error creating record`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Update One Record
	 */
	async updateOne(options: DataSourceUpdateOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		try {
			const tableName = options.schema.table
			const updateFields = Object.keys(options.data)
			const setClause = updateFields.map(field => `${field} = ?`).join(', ')
			const updateValues = Object.values(options.data)

			let cql = `UPDATE ${tableName} SET ${setClause}`
			const params = [...updateValues]

			// Use the primary key for update
			const primaryKey = options.schema.primary_key
			if (options.id) {
				cql += ` WHERE ${primaryKey} = ?`
				params.push(options.id)
			}

			await this.performQuery({
				cql,
				params,
				x_request_id,
			})

			// Return the updated record
			return {
				data: { ...options.data, [primaryKey]: options.id },
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error updating record`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Delete One Record
	 */
	async deleteOne(options: DataSourceDeleteOneOptions, x_request_id?: string): Promise<DeleteResponseObject> {
		try {
			const tableName = options.schema.table
			let cql = `DELETE FROM ${tableName}`
			const params: any[] = []

			// Use the primary key for deletion
			const primaryKey = options.schema.primary_key
			if (options.id) {
				cql += ` WHERE ${primaryKey} = ?`
				params.push(options.id)
			}

			await this.performQuery({
				cql,
				params,
				x_request_id,
			})

			return {
				deleted: 1,
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error deleting record`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Check if a value is unique
	 */
	async isUnique(options: DataSourceUniqueCheckOptions, x_request_id?: string): Promise<IsUniqueResponse> {
		try {
			// Build where conditions from the data object
			const whereConditions: any[] = []
			for (const [field, value] of Object.entries(options.data)) {
				whereConditions.push({
					column: field,
					operator: WhereOperator.equals,
					value,
				})
			}

			const result = await this.findOne({
				schema: options.schema,
				where: whereConditions,
			}, x_request_id)

			return {
				valid: result.data === null,
			}
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error checking uniqueness`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Get total number of records (Note: This is expensive in Cassandra)
	 */
	async findTotalRecords(options: DataSourceFindTotalRecords, x_request_id?: string): Promise<number> {
		try {
			// Warning: COUNT queries are expensive in Cassandra and should be avoided in production
			this.logger.warn(`[${DATABASE_TYPE}] COUNT query executed - this is expensive in Cassandra`)

			const tableName = options.schema.table
			let cql = `SELECT COUNT(*) FROM ${tableName}`
			const params: any[] = []

			if (options.where && options.where.length > 0) {
				const whereConditions: string[] = []
				for (const whereClause of options.where) {
					whereConditions.push(`${whereClause.column} = ?`)
					params.push(whereClause.value)
				}
				cql += ` WHERE ${whereConditions.join(' AND ')}`
			}

			const results = await this.performQuery({
				cql,
				params,
				x_request_id,
			})

			return results[0]?.count || 0
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error counting records`, x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Get database error type
	 */
	getDatabaseErrorType(error: any): DatabaseErrorType {
		const message = error.message?.toLowerCase() || ''

		if (message.includes('already exists') || message.includes('duplicate')) {
			return DatabaseErrorType.DUPLICATE_RECORD
		}
		if (message.includes('unique') || message.includes('constraint')) {
			return DatabaseErrorType.UNIQUE_KEY_VIOLATION
		}
		if (message.includes('not null')) {
			return DatabaseErrorType.NOT_NULL_VIOLATION
		}

		return DatabaseErrorType.UNKNOWN_ERROR
	}
}
