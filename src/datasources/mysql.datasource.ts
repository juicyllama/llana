import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as mysql from 'mysql2/promise'
import { Connection } from 'mysql2/promise'

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
	WhereOperator,
} from '../types/datasource.types'
import { MySQLColumnType } from '../types/datasources/mysql.types'
import { SortCondition } from '../types/schema.types'
import { replaceQ } from '../utils/String'

const DATABASE_TYPE = DataSourceType.MYSQL

@Injectable()
export class MySQL {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	/**
	 * Check if the data source is available
	 */

	async checkDataSource(options: { x_request_id?: string }): Promise<boolean> {
		try {
			await mysql.createConnection(this.configService.get('database.host'))
			return true
		} catch (e) {
			this.logger.error(
				`[${DATABASE_TYPE}] Error checking database connection - ${e.message} ${options.x_request_id ?? ''}`,
			)
			return false
		}
	}

	/**
	 * Performs a query on the database
	 */

	async query(options: { sql: string; values?: any[]; x_request_id?: string }): Promise<any> {
		let connection: Connection

		try {
			if (!mysql) {
				throw new Error(`${DATABASE_TYPE} library is not initialized`)
			}
			connection = await mysql.createConnection(this.configService.get('database.host'))
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error creating database connection - ${e.message}`)
			throw new Error('Error creating database connection')
		}

		try {
			let results
			this.logger.debug(
				`[${DATABASE_TYPE}] ${replaceQ(options.sql, options.values)} ${options.x_request_id ?? ''}`,
			)

			if (!options.values || !options.values.length) {
				;[results] = await connection.query<any[]>(options.sql)
			} else {
				;[results] = await connection.query<any[]>(options.sql, options.values)
			}
			this.logger.debug(`[${DATABASE_TYPE}] Results: ${JSON.stringify(results)} - ${options.x_request_id ?? ''}`)
			connection.end()
			return results
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`)
			this.logger.warn({
				x_request_id: options.x_request_id,
				sql: replaceQ(options.sql, options.values),
				error: {
					message: e.message,
				},
			})
			connection.end()
			throw new Error(e)
		}
	}

	/**
	 * 	Check if a record is unique
	 */

	async uniqueCheck(options: DataSourceUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		for (const column of options.schema.columns) {
			if (column.unique_key) {
				const command = `SELECT COUNT(*) as total FROM ${options.schema.table} WHERE ${column.field} = ?`
				const result = await this.query({
					sql: command,
					values: [options.data[column.field]],
					x_request_id,
				})

				if (result[0].total > 0) {
					return {
						valid: false,
						message: `Record with ${column.field} ${options.data[column.field]} already exists`,
					}
				}
			}
		}

		return {
			valid: true,
		}
	}

	/**
	 * Get Table Schema
	 */

	async getSchema(options: { table: string; x_request_id?: string }): Promise<DataSourceSchema> {
		const columns_result = await this.query({
			sql: `DESCRIBE ${options.table}`,
			x_request_id: options.x_request_id,
		})

		if (!columns_result.length) {
			throw new Error(`Table ${options.table} does not exist  ${options.x_request_id ?? ''}`)
		}

		const columns = columns_result.map((column: any) => {
			return <DataSourceSchemaColumn>{
				field: column.Field,
				type: this.columnTypeFromDataSource(column.Type),
				nullable: column.Null === 'YES',
				required: column.Null === 'NO',
				primary_key: column.Key === 'PRI',
				unique_key: column.Key === 'UNI',
				foreign_key: column.Key === 'MUL',
				default: column.Default,
				extra: column.Extra,
				enums: column.Type.includes('enum')
					? column.Type.match(/'([^']+)'/g).map((e: string) => e.replace(/'/g, ''))
					: undefined,
			}
		})

		const relations_query = `SELECT TABLE_NAME as 'table', COLUMN_NAME as 'column', REFERENCED_TABLE_NAME as 'org_table', REFERENCED_COLUMN_NAME as 'org_column' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = '${options.table}';`
		const relations_result = await this.query({ sql: relations_query, x_request_id: options.x_request_id })
		const relations = relations_result
			.filter((row: DataSourceSchemaRelation) => row.table !== null)
			.map((row: DataSourceSchemaRelation) => row)

		const relation_back_query = `SELECT REFERENCED_TABLE_NAME as 'table', REFERENCED_COLUMN_NAME as 'column', TABLE_NAME as 'org_table', COLUMN_NAME as 'org_column' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${options.table}' AND REFERENCED_TABLE_NAME IS NOT NULL;`
		const relation_back_result = await this.query({
			sql: relation_back_query,
			x_request_id: options.x_request_id,
		})
		const relations_back = relation_back_result
			.filter((row: DataSourceSchemaRelation) => row.table !== null)
			.map((row: DataSourceSchemaRelation) => row)

		relations.push(...relations_back)

		return {
			table: options.table,
			columns,
			primary_key: columns.find(column => column.primary_key)?.field,
			relations,
		}
	}

	/**
	 * Create table from schema object
	 */

	async createTable(schema: DataSourceSchema, x_request_id?: string): Promise<boolean> {
		try {
			const columns = schema.columns.map(column => {
				let column_string = `\`${column.field}\` ${this.columnTypeToDataSource(column.type)}`

				if (column.type === DataSourceColumnType.STRING) {
					column_string += `(${column.extra?.length ?? 255})`
				}

				if (column.type === DataSourceColumnType.ENUM) {
					column_string += `(${column.enums?.map(e => `'${e}'`).join(', ')})`
				}

				if (column.required) {
					column_string += ' NOT NULL'
				}

				if (column.unique_key) {
					column_string += ' UNIQUE'
				}

				if (column.primary_key) {
					column_string += ' PRIMARY KEY'
				}

				if (column.default) {
					column_string += ` DEFAULT ${column.default}`
				}

				if (column.auto_increment) {
					column_string += ' AUTO_INCREMENT'
				}

				return column_string
			})

			const command = `CREATE TABLE ${schema.table} (${columns.join(', ')})`

			await this.query({ sql: command })

			if (schema.relations?.length) {
				for (const relation of schema.relations) {
					const command = `ALTER TABLE ${schema.table} ADD FOREIGN KEY (${relation.column}) REFERENCES ${relation.org_table}(${relation.org_column})`
					await this.query({ sql: command })
				}
			}

			return true
		} catch (e) {
			this.logger.error(
				`[${DATABASE_TYPE}][createTable] Error creating table ${schema.table} - ${e}`,
				x_request_id,
			)
			return false
		}
	}

	/**
	 * List all tables in the database
	 */

	async listTables(options: { x_request_id?: string }): Promise<string[]> {
		try {
			const results = await this.query({ sql: 'SHOW TABLES', x_request_id: options.x_request_id })
			const tables = results.map(row => Object.values(row)[0]) as string[]
			this.logger.debug(`[${DATABASE_TYPE}] Tables: ${tables} ${options.x_request_id ?? ''}`)
			return tables
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error listing tables ${options.x_request_id ?? ''}`)
			throw new Error(e)
		}
	}

	/**
	 * Insert a record
	 */

	async createOne(options: DataSourceCreateOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		const table_name = options.schema.table
		const values: any[] = []

		options = this.pipeObjectToDataSource(options) as DataSourceCreateOneOptions

		const columns = Object.keys(options.data)
		const dataValues = Object.values(options.data)

		values.push(...dataValues)

		const command = `INSERT INTO ${table_name} (\`${columns.join('`, `')}\`) VALUES ( ?${values.map(() => ``).join(', ?')} )`

		const result = await this.query({ sql: command, values, x_request_id })

		return await this.findOne(
			{
				schema: options.schema,
				where: [
					{
						column: options.schema.primary_key,
						operator: WhereOperator.equals,
						value: result.insertId,
					},
				],
			},
			x_request_id,
		)
	}

	/**
	 * Find single record
	 */

	async findOne(options: DataSourceFindOneOptions, x_request_id: string): Promise<FindOneResponseObject | undefined> {
		let [command, values] = this.find(options)
		command += ` LIMIT 1`

		const results = await this.query({ sql: command, values, x_request_id })

		if (!results[0]) {
			return
		}

		return this.pipeObjectFromDataSource(options, results[0])
	}

	/**
	 * Find multiple records
	 */

	async findMany(options: DataSourceFindManyOptions, x_request_id: string): Promise<FindManyResponseObject> {
		const total = await this.findTotalRecords(options, x_request_id)

		let results: any[] = []

		if (total > 0) {
			let [command, values] = this.find(options)

			let sort: SortCondition[] = []
			if (options.sort) {
				sort = options.sort?.filter(sort => !sort.column.includes('.'))
			}

			if (sort?.length) {
				command += ` ORDER BY ${sort.map(sort => `${sort.column} ${sort.operator}`).join(', ')}`
			}

			if (!options.limit) {
				options.limit = this.configService.get<number>('database.defaults.limit') ?? 20
			}

			if (!options.offset) {
				options.offset = 0
			}

			command += ` LIMIT ${options.limit} OFFSET ${options.offset}`

			results = await this.query({ sql: command, values, x_request_id })

			for (const r in results) {
				results[r] = this.pipeObjectFromDataSource(options, results[r])
			}
		}

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
	}

	/**
	 * Get total records with where conditions
	 */

	async findTotalRecords(options: DataSourceFindTotalRecords, x_request_id: string): Promise<number> {
		let [command, values] = this.find(options, true)
		const results = await this.query({ sql: command, values, x_request_id })
		return Number(results[0].total)
	}

	/**
	 * Update one records
	 */

	async updateOne(options: DataSourceUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		const table_name = options.schema.table

		options = this.pipeObjectToDataSource(options) as DataSourceUpdateOneOptions

		const values = [...Object.values(options.data), options.id.toString()]
		let command = `UPDATE ${table_name} SET `

		command += `${Object.keys(options.data)
			.map(key => `${key} = ?`)
			.join(', ')} `

		command += `WHERE ${options.schema.primary_key} = ?`

		await this.query({ sql: command, values, x_request_id })

		return await this.findOne(
			{
				schema: options.schema,
				where: [
					{
						column: options.schema.primary_key,
						operator: WhereOperator.equals,
						value: options.id,
					},
				],
			},
			x_request_id,
		)
	}

	/**
	 * Delete single record
	 */

	async deleteOne(options: DataSourceDeleteOneOptions, x_request_id: string): Promise<DeleteResponseObject> {
		if (options.softDelete) {
			const result = await this.updateOne(
				{
					id: options.id,
					schema: options.schema,
					data: {
						[options.softDelete]: new Date().toISOString().slice(0, 19).replace('T', ' '),
					},
				},
				x_request_id,
			)

			if (result) {
				return {
					deleted: 1,
				}
			}
		}

		const table_name = options.schema.table

		const values = [options.id]
		let command = `DELETE FROM ${table_name} `

		command += `WHERE ${options.schema.primary_key} = ?`

		const result = await this.query({ sql: command, values, x_request_id })

		return {
			deleted: result.affectedRows,
		}
	}

	/**
	 * Truncate table
	 */

	async truncate(table: string): Promise<void> {
		return await this.query({ sql: 'TRUNCATE TABLE ' + table })
	}

	/**
	 * Convert MySQL column type to DataSourceColumnType
	 */

	private columnTypeFromDataSource(type: MySQLColumnType): DataSourceColumnType {
		if (type.includes('enum')) {
			return DataSourceColumnType.ENUM
		}

		if (type.includes('int')) {
			return DataSourceColumnType.NUMBER
		}

		if (type.includes('text') || type.includes('blob') || type.includes('binary') || type.includes('varchar')) {
			return DataSourceColumnType.STRING
		}

		if (
			type.includes('decimal') ||
			type.includes('float') ||
			type.includes('double') ||
			type.includes('numeric') ||
			type.includes('real')
		) {
			return DataSourceColumnType.NUMBER
		}

		switch (type) {
			case MySQLColumnType.INT:
			case MySQLColumnType.TINYINT:
			case MySQLColumnType.SMALLINT:
			case MySQLColumnType.MEDIUMINT:
			case MySQLColumnType.BIGINT:
			case MySQLColumnType.FLOAT:
			case MySQLColumnType.DOUBLE:
			case MySQLColumnType.DECIMAL:
			case MySQLColumnType.NUMERIC:
			case MySQLColumnType.REAL:
			case MySQLColumnType.TIMESTAMP:
			case MySQLColumnType.YEAR:
				return DataSourceColumnType.NUMBER
			case MySQLColumnType.CHAR:
			case MySQLColumnType.VARCHAR:
			case MySQLColumnType.TEXT:
			case MySQLColumnType.TINYTEXT:
			case MySQLColumnType.MEDIUMTEXT:
			case MySQLColumnType.LONGTEXT:
			case MySQLColumnType.ENUM:
				return DataSourceColumnType.STRING
			case MySQLColumnType.DATE:
			case MySQLColumnType.DATETIME:
			case MySQLColumnType.TIME:
				return DataSourceColumnType.DATE
			case MySQLColumnType.BOOL:
			case MySQLColumnType.BOOLEAN:
				return DataSourceColumnType.BOOLEAN
			case MySQLColumnType.JSON:
				return DataSourceColumnType.JSON
			case MySQLColumnType.SET:
			case MySQLColumnType.BLOB:
			case MySQLColumnType.TINYBLOB:
			case MySQLColumnType.MEDIUMBLOB:
			case MySQLColumnType.LONGBLOB:
			case MySQLColumnType.BINARY:
			case MySQLColumnType.VARBINARY:
			default:
				return DataSourceColumnType.UNKNOWN
		}
	}

	/**
	 * Convert DataSourceColumnType to MySQL column type
	 */

	private columnTypeToDataSource(type: DataSourceColumnType): MySQLColumnType {
		switch (type) {
			case DataSourceColumnType.STRING:
				return MySQLColumnType.VARCHAR
			case DataSourceColumnType.NUMBER:
				return MySQLColumnType.INT
			case DataSourceColumnType.BOOLEAN:
				return MySQLColumnType.BOOLEAN
			case DataSourceColumnType.DATE:
				return MySQLColumnType.DATETIME
			case DataSourceColumnType.JSON:
				return MySQLColumnType.JSON
			case DataSourceColumnType.ENUM:
				return MySQLColumnType.ENUM
			default:
				return MySQLColumnType.VARCHAR
		}
	}

	/**
	 * Pipe object to DataSource
	 */

	private pipeObjectToDataSource(
		options: DataSourceCreateOneOptions | DataSourceUpdateOneOptions,
	): DataSourceCreateOneOptions | DataSourceUpdateOneOptions {
		for (const column of options.schema.columns) {
			if (!options.data[column.field]) {
				continue
			}

			switch (column.type) {
				case DataSourceColumnType.BOOLEAN:
					if (options.data[column.field] === true) {
						options.data[column.field] = 1
					} else if (options.data[column.field] === false) {
						options.data[column.field] = 0
					}
					break
				case DataSourceColumnType.DATE:
					if (options.data[column.field]) {
						options.data[column.field] = new Date(options.data[column.field])
							.toISOString()
							.slice(0, 19)
							.replace('T', ' ')
					}
					break

				default:
					continue
			}
		}

		return options
	}

	/**
	 * Pipe DataSource object to object
	 */

	private pipeObjectFromDataSource(options: DataSourceFindOneOptions, data: { [key: string]: any }): object {
		for (const key in data) {
			let column

			if (key.includes('.')) {
				const [table, field] = key.split('.')
				const relation = options.relations.find(r => r.table === table)
				column = relation.schema.columns.find(c => c.field === field)
			} else {
				column = options.schema.columns.find(c => c.field === key)
			}

			switch (column.type) {
				case DataSourceColumnType.BOOLEAN:
					data[key] = data[key] === 1
					break
				case DataSourceColumnType.DATE:
					if (data[key] !== null) {
						data[key] = new Date(data[key]).toISOString()
					}
					break
				case DataSourceColumnType.NUMBER:
					data[key] = Number(data[key])
					break
			}
		}

		return data
	}

	/**
	 * Mysql speicific helper function to build the find query
	 */

	private find(
		options: DataSourceFindOneOptions | DataSourceFindManyOptions,
		count: boolean = false,
	): [string, string[]] {
		const table_name = options.schema.table
		let values: any[] = []

		let command

		if (count) {
			command = `SELECT COUNT(*) as total `
		} else {
			command = `SELECT `

			if (options.fields?.length) {
				for (const f in options.fields) {
					command += ` \`${options.schema.table}\`.\`${options.fields[f]}\` as \`${options.fields[f]}\`,`
				}
				command = command.slice(0, -1)
			} else {
				command += ` \`${options.schema.table}\`.* `
			}
		}

		command += ` FROM ${table_name} `

		if (options.where?.length) {
			command += `WHERE `

			for (const w in options.where) {
				if (options.where[w].operator === WhereOperator.search) {
					options.where[w].value = '%' + options.where[w].value + '%'
				}
			}

			// Add deletedAt IS NULL condition if not already present and if the column exists
			const hasDeletedAtColumn = options.schema.columns.some(col => col.field === 'deletedAt');
			if (hasDeletedAtColumn && !options.where.some(w => w.column === 'deletedAt')) {
				options.where.push({
					column: 'deletedAt',
					operator: WhereOperator.null,
					value: null
				});
			}

			command += `${options.where.map(w => {
				const columnRef = w.column.includes('.') ? w.column : `\`${table_name}\`.\`${w.column}\``
				if (w.operator === WhereOperator.search) {
					return `${columnRef} LIKE ?`
				} else if (w.operator === WhereOperator.in || w.operator === WhereOperator.not_in) {
					const valueArray = Array.isArray(w.value) ? w.value : w.value.toString().split(',').map(v => v.trim())
					const placeholders = valueArray.map(() => '?').join(',')
					return `${columnRef} ${w.operator === WhereOperator.in ? 'IN' : 'NOT IN'} (${placeholders})`
				} else if (w.operator === WhereOperator.equals || w.operator === WhereOperator.not_equals) {
					return `${columnRef} ${w.operator} ?`
				} else if (w.operator === WhereOperator.null || w.operator === WhereOperator.not_null) {
					return `${columnRef} ${w.operator}`
				} else {
					return `${columnRef} ${w.operator} ?`
				}
			}).join(' AND ')} `

			// Process values for WHERE clause
			for (const w of options.where) {
				if (w.value === undefined || w.operator === WhereOperator.null || w.operator === WhereOperator.not_null) continue
				
				if (w.operator === WhereOperator.in || w.operator === WhereOperator.not_in) {
					const valueArray = Array.isArray(w.value) ? w.value : w.value.toString().split(',').map(v => v.trim())
					values.push(...valueArray)
				} else {
					values.push(w.value)
				}
			}
		}

		return [command.trim(), values]
	}
}
