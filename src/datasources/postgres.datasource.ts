import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as pg from 'pg'

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
import { PostgreSQLColumnType } from '../types/datasources/postgres.types'
import { SortCondition } from '../types/schema.types'

const DATABASE_TYPE = DataSourceType.POSTGRES

@Injectable()
export class Postgres {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	async createConnection(): Promise<pg.Client> {
		try {
			const { Client } = pg

			if (!Client) {
				throw new Error(`${DATABASE_TYPE} library is not initialized`)
			}

			const client = new Client(this.configService.get('database.host'))
			await client.connect()
			return client
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

	async performQuery(options: { sql: string; values?: any[]; x_request_id?: string }): Promise<any> {
		const connection = await this.createConnection()

		try {
			let results

			//if last character is not a semicolon, add it
			if (options.sql.slice(-1) !== ';') {
				options.sql += ';'
			}

			this.logger.debug(
				`[${DATABASE_TYPE}] ${options.sql} ${options.values ? 'Values: ' + JSON.stringify(options.values) : ''} - ${options.x_request_id ?? ''}`,
			)

			if (!options.values || !options.values.length) {
				const res = await connection.query(options.sql)
				results = res.rows
			} else {
				const res = await connection.query(options.sql, options.values)
				results = res.rows
			}
			this.logger.debug(`[${DATABASE_TYPE}] Results: ${JSON.stringify(results)} - ${options.x_request_id ?? ''}`)
			connection.end()
			return results
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query - ${options.x_request_id ?? ''}`)
			this.logger.warn({
				sql: {
					sql: options.sql,
					values: options.values ?? [],
				},
				error: {
					message: e.message,
				},
			})
			connection.end()
			throw new Error(e)
		}
	}

	/**
	 * List all tables in the database
	 */

	async listTables(options: { x_request_id?: string }): Promise<string[]> {
		try {
			const results = await this.performQuery({
				sql: "SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';",
				x_request_id: options.x_request_id,
			})
			const tables = results.map((table: any) => table.tablename)
			this.logger.debug(`[${DATABASE_TYPE}] Tables: ${tables}`, options.x_request_id)
			return tables
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error listing tables`, options.x_request_id)
			throw new Error(e)
		}
	}

	/**
	 * Get Table Schema
	 * @param repository
	 * @param table_name
	 */

	async getSchema(options: { table: string; x_request_id?: string }): Promise<DataSourceSchema> {
		let sql = `SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default",
			CASE
				WHEN column_name = ANY (SELECT kcu.column_name
							  FROM information_schema.key_column_usage AS kcu
							  JOIN information_schema.table_constraints AS tc
							  ON kcu.constraint_name = tc.constraint_name
							  WHERE kcu.table_name = '${options.table}' AND tc.constraint_type = 'PRIMARY KEY')
				THEN 'PRI'
				ELSE ''
			END AS "Key",
			CASE
				WHEN column_name = ANY (SELECT kcu.column_name
							  FROM information_schema.key_column_usage AS kcu
							  JOIN information_schema.table_constraints AS tc
							  ON kcu.constraint_name = tc.constraint_name
							  WHERE kcu.table_name = '${options.table}' AND tc.constraint_type = 'UNIQUE')
				THEN 'UNI'
				ELSE ''
			END AS "Key_Unique",
			CASE
				WHEN column_name = ANY (SELECT kcu.column_name
							  FROM information_schema.key_column_usage AS kcu
							  JOIN information_schema.table_constraints AS tc
							  ON kcu.constraint_name = tc.constraint_name
							  WHERE kcu.table_name = '${options.table}' AND tc.constraint_type = 'FOREIGN KEY')
				THEN 'MUL'
				ELSE ''
			END AS "Key_Multiple",
		'extra' AS "Extra"
		FROM information_schema.columns WHERE table_name = '${options.table}'`

		const columns_result = await this.performQuery({
			sql: sql,
			x_request_id: options.x_request_id,
		})

		if (!columns_result.length) {
			throw new Error(`Table ${options.table} does not exist`)
		}

		const columns = columns_result.map((column: any) => {
			return <DataSourceSchemaColumn>{
				field: column.Field,
				type: this.fieldMapper(column.Type),
				nullable: column.Null === 'YES',
				required: column.Null === 'NO',
				primary_key: column.Key === 'PRI',
				unique_key: column.Key_Unique === 'UNI',
				foreign_key: column.Key_Multiple === 'MUL',
				default: column.Default,
				extra: column.Extra,
			}
		})

		const relations_query = `SELECT tc.table_name AS "org_table", kcu.column_name AS "org_column", ccu.table_name AS "table", ccu.column_name AS "column"
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
		JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '${options.table}';`

		const relations_result = await this.performQuery({ sql: relations_query, x_request_id: options.x_request_id })

		const relations = relations_result
			.filter((row: DataSourceSchemaRelation) => row.table !== null)
			.map((row: DataSourceSchemaRelation) => row)

		const relations_back_query = `SELECT tc.table_name AS "table", kcu.column_name AS "column", ccu.table_name AS "org_table", ccu.column_name AS "org_column"
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
		JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = '${options.table}';`

		const relation_back_result = await this.performQuery({
			sql: relations_back_query,
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
	 * Insert a record
	 */

	async createOne(options: DataSourceCreateOneOptions, x_request_id?: string): Promise<FindOneResponseObject> {
		const table_name = options.schema.table
		const values: any[] = []

		options = this.pipeObjectToPostgres(options) as DataSourceCreateOneOptions

		const columns = Object.keys(options.data)
		const dataValues = Object.values(options.data)

		values.push(...dataValues)

		const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
		const command = `INSERT INTO "${table_name}" (${columns.map(column => `"${column}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`

		const result = await this.performQuery({ sql: command, values, x_request_id })
		return this.formatOutput(options, result[0])
	}

	/**
	 * Find single record
	 */

	async findOne(options: DataSourceFindOneOptions, x_request_id: string): Promise<FindOneResponseObject | undefined> {
		let [command, values] = this.find(options)
		command += ` LIMIT 1`

		const result = await this.performQuery({ sql: command, values, x_request_id })

		if (!result[0]) {
			return
		}

		return this.formatOutput(options, result[0])
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

			results = await this.performQuery({ sql: command, values, x_request_id })

			for (const r in results) {
				results[r] = this.formatOutput(options, results[r])
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
		const results = await this.performQuery({ sql: command, values, x_request_id })
		return Number(results[0].total)
	}

	/**
	 * Update one records
	 */

	async updateOne(options: DataSourceUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		const table_name = options.schema.table
		let index = 1

		const values = [...Object.values(options.data), options.id.toString()]
		let command = `UPDATE "${table_name}" SET `

		options = this.pipeObjectToPostgres(options) as DataSourceUpdateOneOptions

		for (const column in options.data) {
			command += `"${column}" = $${index}, `
			index++
		}

		command = command.slice(0, -2)

		command += ` WHERE "${options.schema.primary_key}" = $${index}`
		command += ` RETURNING *`

		const result = await this.performQuery({ sql: command, values, x_request_id })
		return this.formatOutput(options, result[0])
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

			return {
				deleted: result ? 1 : 0,
			}
		} else {
			const table_name = options.schema.table

			const values = [options.id]
			let command = `DELETE FROM "${table_name}" `

			command += `WHERE "${options.schema.primary_key}" = $1 RETURNING *`

			const result = await this.performQuery({ sql: command, values, x_request_id })

			return {
				deleted: result[0] ? 1 : 0,
			}
		}
	}

	async uniqueCheck(options: DataSourceUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		for (const column of options.schema.columns) {
			if (column.unique_key) {
				const command = `SELECT COUNT(*) as total FROM "${options.schema.table}" WHERE ${column.field} = $1`
				const result = await this.performQuery({
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
	 * Create table from schema object
	 */

	async createTable(schema: DataSourceSchema, x_request_id?: string): Promise<boolean> {
		try {
			let command = `CREATE TABLE "${schema.table}" (`

			for (const column of schema.columns) {
				command += ` "${column.field}" `

				switch (column.type) {
					case DataSourceColumnType.STRING:
						command += `${this.fieldMapperReverse(column.type)}(${column.extra?.length ?? 255})`
						break

					case DataSourceColumnType.ENUM:
						await this.performQuery({ sql: `DROP TYPE IF EXISTS ${schema.table}_${column.field}_enum` })
						await this.performQuery({
							sql: `CREATE TYPE ${schema.table}_${column.field}_enum AS ENUM (${column.enums.map(e => `'${e}'`).join(', ')})`,
						})
						command += `${schema.table}_${column.field}_enum`
						break

					default:
						command += `${this.fieldMapperReverse(column.type)}`
				}

				if (column.required) {
					command += ' NOT NULL'
				}

				if (column.unique_key) {
					command += ' UNIQUE'
				}

				if (column.primary_key) {
					command += ' PRIMARY KEY'
				}

				if (column.default) {
					command += ` DEFAULT ${column.default}`
				}

				if (column.auto_increment) {
					command += ' GENERATED ALWAYS AS IDENTITY'
				}

				command += `,`
			}

			//remove last comma
			command = command.slice(0, -1)
			command += `)`

			await this.performQuery({ sql: command })

			if (schema.relations?.length) {
				for (const relation of schema.relations) {
					const command = `ALTER TABLE "${schema.table}" ADD FOREIGN KEY ("${relation.column}") REFERENCES "${relation.org_table}"("${relation.org_column}")`
					await this.performQuery({ sql: command })
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

	private find(
		options: DataSourceFindOneOptions | DataSourceFindManyOptions,
		count: boolean = false,
	): [string, any[]] {
		const table_name = options.schema.table
		let values: any[] = []
		let index = 1

		let command

		if (count) {
			command = `SELECT COUNT(*) as total `
		} else {
			command = `SELECT `

			if (options.fields?.length) {
				for (const f in options.fields) {
					command += ` "${options.schema.table}"."${options.fields[f]}" as "${options.fields[f]}",`
				}
				command = command.slice(0, -1)
			} else {
				command += ` "${options.schema.table}".* `
			}
		}

		command += ` FROM "${table_name}" `

		if (options.where?.length) {
			command += `WHERE `

			for (const w in options.where) {
				if (options.where[w].operator === WhereOperator.search) {
					options.where[w].value = '%' + options.where[w].value + '%'
				}
			}

			for (const w of options.where) {
				if (w.column.includes('.')) {
					const items = w.column.split('.')
					command += `"${items[0]}"."${items[1]}"`
				} else {
					command += `"${table_name}"."${w.column}"`
				}

				if (w.operator === WhereOperator.in || w.operator === WhereOperator.not_in) {
					const valueArray = Array.isArray(w.value)
						? w.value
						: w.value
								.toString()
								.split(',')
								.map(v => v.trim())
					const placeholders = valueArray.map(() => `$${index++}`).join(',')
					command += ` ${w.operator === WhereOperator.in ? 'IN' : 'NOT IN'} (${placeholders}) AND `
				} else {
					command += ` ${w.operator === WhereOperator.search ? 'LIKE' : w.operator} ${w.operator !== WhereOperator.not_null && w.operator !== WhereOperator.null ? '$' + index : ''}  AND `
				}

				index++
			}

			command = command.slice(0, -4)

			for (const w of options.where) {
				if (w.value === undefined || w.operator === WhereOperator.null || w.operator === WhereOperator.not_null)
					continue

				if (w.operator === WhereOperator.in || w.operator === WhereOperator.not_in) {
					const valueArray = Array.isArray(w.value)
						? w.value
						: w.value
								.toString()
								.split(',')
								.map(v => v.trim())
					values.push(...valueArray)
				} else {
					values.push(w.value)
				}
			}
		}

		return [command.trim(), values]
	}

	private fieldMapper(type: PostgreSQLColumnType): DataSourceColumnType {
		if (type.includes('enum')) {
			return DataSourceColumnType.ENUM
		}

		switch (type) {
			case PostgreSQLColumnType.INT:
			case PostgreSQLColumnType.DOUBLE:
			case PostgreSQLColumnType.NUMERIC:
			case PostgreSQLColumnType.REAL:
			case PostgreSQLColumnType.TIMESTAMP:
			case PostgreSQLColumnType.YEAR:
				return DataSourceColumnType.NUMBER
			case PostgreSQLColumnType.CHAR:
			case PostgreSQLColumnType.VARCHAR:
			case PostgreSQLColumnType.TEXT:
			case PostgreSQLColumnType.ENUM:
				return DataSourceColumnType.STRING
			case PostgreSQLColumnType.DATE:
			case PostgreSQLColumnType.DATETIME:
			case PostgreSQLColumnType.TIME:
				return DataSourceColumnType.DATE
			case PostgreSQLColumnType.BOOLEAN:
				return DataSourceColumnType.BOOLEAN
			case PostgreSQLColumnType.JSON:
				return DataSourceColumnType.JSON
			case PostgreSQLColumnType.BINARY:
			default:
				return DataSourceColumnType.UNKNOWN
		}
	}

	private fieldMapperReverse(type: DataSourceColumnType): PostgreSQLColumnType {
		switch (type) {
			case DataSourceColumnType.STRING:
				return PostgreSQLColumnType.VARCHAR
			case DataSourceColumnType.NUMBER:
				return PostgreSQLColumnType.INT
			case DataSourceColumnType.BOOLEAN:
				return PostgreSQLColumnType.BOOLEAN
			case DataSourceColumnType.DATE:
				return PostgreSQLColumnType.DATETIME
			case DataSourceColumnType.JSON:
				return PostgreSQLColumnType.JSON
			case DataSourceColumnType.ENUM:
				return PostgreSQLColumnType.ENUM
			default:
				return PostgreSQLColumnType.VARCHAR
		}
	}

	private pipeObjectToPostgres(
		options: DataSourceCreateOneOptions | DataSourceUpdateOneOptions,
	): DataSourceCreateOneOptions | DataSourceUpdateOneOptions {
		for (const column of options.schema.columns) {
			if (options.data[column.field] === undefined || options.data[column.field] === null) {
				continue
			}

			switch (column.type) {
				case DataSourceColumnType.BOOLEAN:
					// PostgreSQL supports native boolean type, so we just ensure it's a boolean
					// Only convert to boolean if it's not already a boolean
					if (typeof options.data[column.field] !== 'boolean') {
						options.data[column.field] = Boolean(options.data[column.field])
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

	private formatOutput(options: DataSourceFindOneOptions, data: { [key: string]: any }): object {
		for (const key in data) {
			if (key.includes('.')) {
				const [table, field] = key.split('.')
				const relation = options.relations.find(r => r.table === table)
				data[key] = this.formatField(relation.schema.columns.find(c => c.field === field).type, data[key])
			} else {
				const column = options.schema.columns.find(c => c.field === key)
				data[key] = this.formatField(column.type, data[key])
			}
		}

		return data
	}

	/**
	 *
	 */

	private formatField(type: DataSourceColumnType, value: any): any {
		if (value === null) {
			return null
		}

		switch (type) {
			case DataSourceColumnType.BOOLEAN:
				// PostgreSQL returns native boolean values, so we just ensure it's a proper boolean
				// Only convert to boolean if it's not already a boolean
				return typeof value === 'boolean' ? value : Boolean(value)
			case DataSourceColumnType.DATE:
				return new Date(value).toISOString()
			case DataSourceColumnType.NUMBER:
				return Number(value)
			default:
				return value
		}
	}

	async truncate(table: string): Promise<void> {
		return await this.performQuery({ sql: 'TRUNCATE TABLE ' + table })
	}
}
