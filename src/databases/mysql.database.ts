import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as mysql from 'mysql2/promise'
import { Connection } from 'mysql2/promise'
import { SortCondition } from 'src/types/schema.types'

import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import {
	DatabaseColumnType,
	DatabaseCreateOneOptions,
	DatabaseDeleteOneOptions,
	DatabaseFindManyOptions,
	DatabaseFindOneOptions,
	DatabaseFindTotalRecords,
	DatabaseSchema,
	DatabaseSchemaColumn,
	DatabaseSchemaRelation,
	DatabaseUniqueCheckOptions,
	DatabaseUpdateOneOptions,
	WhereOperator,
} from '../types/database.types'
import { MySQLColumnType } from '../types/databases/mysql.types'
import {
	DeleteResponseObject,
	FindManyResponseObject,
	FindOneResponseObject,
	IsUniqueResponse,
} from '../types/response.types'

@Injectable()
export class MySQL {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	/**
	 * Create a MySQL connection
	 */
	async createConnection(): Promise<Connection> {
		if (!mysql) {
			throw new Error('MySQL library is not initialized')
		}
		return await mysql.createConnection(this.configService.get('database.host'))
	}

	async performQuery(sql: string, values?: any[]): Promise<any> {
		const connection = await this.createConnection()

		try {
			let results
			this.logger.debug(`[MySQL][Query] ${sql}`, values)

			if (!values || !values.length) {
				;[results] = await connection.query<any[]>(sql)
			} else {
				;[results] = await connection.query<any[]>(sql, values)
			}
			this.logger.debug(`[MySQL][Query] Results`, results)
			connection.end()
			return results
		} catch (e) {
			this.logger.warn('Error executing mysql database query')
			this.logger.warn({
				sql: {
					sql,
					values: values ?? [],
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
	 * Get Table Schema
	 * @param repository
	 * @param table_name
	 */

	async getSchema(table_name: string): Promise<DatabaseSchema> {
		const columns_result = await this.performQuery(`DESCRIBE ${table_name}`)

		const columns = columns_result.map((column: any) => {
			return <DatabaseSchemaColumn>{
				field: column.Field,
				type: this.fieldMapper(column.Type),
				nullable: column.Null === 'YES',
				required: column.Null === 'NO',
				primary_key: column.Key === 'PRI',
				unique_key: column.Key === 'UNI',
				foreign_key: column.Key === 'MUL',
				default: column.Default,
				extra: column.Extra,
			}
		})

		const relations_query = `SELECT TABLE_NAME as 'table', COLUMN_NAME as 'column', REFERENCED_TABLE_NAME as 'org_table', REFERENCED_COLUMN_NAME as 'org_column' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = '${table_name}';`
		const relations_result = await this.performQuery(relations_query)
		const relations = relations_result
			.filter((row: DatabaseSchemaRelation) => row.table !== null)
			.map((row: DatabaseSchemaRelation) => row)

		const relation_back_query = `SELECT REFERENCED_TABLE_NAME as 'table', REFERENCED_COLUMN_NAME as 'column', TABLE_NAME as 'org_table', COLUMN_NAME as 'org_column' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${table_name}' AND REFERENCED_TABLE_NAME IS NOT NULL;`
		const relation_back_result = await this.performQuery(relation_back_query)
		const relation_back = relation_back_result
			.filter((row: DatabaseSchemaRelation) => row.table !== null)
			.map((row: DatabaseSchemaRelation) => row)

		relations.push(...relation_back)

		return {
			table: table_name,
			columns,
			primary_key: columns.find(column => column.primary_key)?.field,
			relations,
		}
	}

	/**
	 * Insert a record
	 */

	async createOne(options: DatabaseCreateOneOptions): Promise<FindOneResponseObject> {
		const table_name = options.schema.table
		const values: any[] = []

		options = this.pipeObjectToMySQL(options) as DatabaseCreateOneOptions

		const columns = Object.keys(options.data)
		const dataValues = Object.values(options.data)

		values.push(...dataValues)

		const command = `INSERT INTO ${table_name} (\`${columns.join('`, `')}\`) VALUES ( ?${values.map(() => ``).join(', ?')} )`

		const result = await this.performQuery(command, values)

		return await this.findOne({
			schema: options.schema,
			where: [
				{
					column: options.schema.primary_key,
					operator: WhereOperator.equals,
					value: result.insertId,
				},
			],
		})
	}

	/**
	 * Find single record
	 */

	async findOne(options: DatabaseFindOneOptions): Promise<FindOneResponseObject | undefined> {
		let [command, values] = this.find(options)
		command += ` LIMIT 1`

		const results = await this.performQuery(command, values)

		if (!results[0]) {
			return
		}

		return this.formatOutput(options, results[0])
	}

	/**
	 * Find multiple records
	 */

	async findMany(options: DatabaseFindManyOptions): Promise<FindManyResponseObject> {
		const total = await this.findTotalRecords(options)

		let [command, values] = this.find(options)

		let sort: SortCondition[] = []
		if (options.sort) {
			sort = options.sort?.filter(sort => !sort.column.includes('.'))
		}

		if (sort?.length) {
			command += `ORDER BY ${sort.map(sort => `${sort.column} ${sort.operator}`).join(', ')}`
		}

		if (!options.limit) {
			options.limit = this.configService.get<number>('database.defaults.limit') ?? 20
		}

		if (!options.offset) {
			options.offset = 0
		}

		command += ` LIMIT ${options.limit} OFFSET ${options.offset}`

		const results = await this.performQuery(command, values)

		for (const r in results) {
			results[r] = this.formatOutput(options, results[r])
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

	async findTotalRecords(options: DatabaseFindTotalRecords): Promise<number> {
		let [command, values] = this.find(options, true)
		const results = await this.performQuery(command, values)
		return results[0].total
	}

	/**
	 * Update one records
	 */

	async updateOne(options: DatabaseUpdateOneOptions): Promise<FindOneResponseObject> {
		const table_name = options.schema.table

		const values = [...Object.values(options.data), options.id.toString()]
		let command = `UPDATE ${table_name} SET `

		options = this.pipeObjectToMySQL(options) as DatabaseUpdateOneOptions

		command += `${Object.keys(options.data)
			.map(key => `${key} = ?`)
			.join(', ')} `

		command += `WHERE ${options.schema.primary_key} = ?`

		await this.performQuery(command, values)

		return await this.findOne({
			schema: options.schema,
			where: [
				{
					column: options.schema.primary_key,
					operator: WhereOperator.equals,
					value: options.id,
				},
			],
		})
	}

	/**
	 * Delete single record
	 */

	async deleteOne(options: DatabaseDeleteOneOptions): Promise<DeleteResponseObject> {
		if (options.softDelete) {
			const result = await this.updateOne({
				id: options.id,
				schema: options.schema,
				data: {
					[options.softDelete]: new Date().toISOString().slice(0, 19).replace('T', ' '),
				},
			})

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

		const result = await this.performQuery(command, values)

		return {
			deleted: result.affectedRows,
		}
	}

	async uniqueCheck(options: DatabaseUniqueCheckOptions): Promise<IsUniqueResponse> {
		for (const column of options.schema.columns) {
			if (column.unique_key) {
				const command = `SELECT COUNT(*) as total FROM ${options.schema.table} WHERE ${column.field} = ?`
				const result = await this.performQuery(command, [options.data[column.field]])

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

	async createTable(schema: DatabaseSchema): Promise<boolean> {
		try {
			const columns = schema.columns.map(column => {
				let column_string = `\`${column.field}\` ${this.fieldMapperReverse(column.type)}`

				if (column.type === DatabaseColumnType.STRING) {
					column_string += `(${column.extra?.length ?? 255})`
				}

				if (column.type === DatabaseColumnType.ENUM) {
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

			await this.performQuery(command)

			return true
		} catch (e) {
			this.logger.error(`[MySQL][createTable] Error creating table ${schema.table}`, { e })
			return false
		}
	}

	private find(
		options: DatabaseFindOneOptions | DatabaseFindManyOptions,
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

			if (options.relations?.length) {
				for (const r in options.relations) {
					if (options.relations[r].columns?.length) {
						for (const c in options.relations[r].columns) {
							command += `, \`${options.relations[r].table}\`.\`${options.relations[r].columns[c]}\` as \`${options.relations[r].table}.${options.relations[r].columns[c]}\` `
						}
					}
				}
			}
		}

		command += ` FROM ${table_name} `

		if (options.relations?.length) {
			for (const relation of options.relations) {
				command += `${relation.join.type ?? 'INNER JOIN'} ${relation.join.table} ON ${relation.join.org_table}.${relation.join.org_column} = ${relation.join.table}.${relation.join.column} `
			}
		}
		
		if (options.where?.length) {
			command += `WHERE `

			for (const w in options.where) {
				if (options.where[w].operator === WhereOperator.search) {
					options.where[w].value = '%' + options.where[w].value + '%'
				}
			}

			command += `${options.where.map(w => `${w.column.includes('.') ? w.column : table_name + '.' + w.column} ${w.operator === WhereOperator.search ? 'LIKE' : w.operator} ${w.operator !== WhereOperator.not_null && w.operator !== WhereOperator.null ? '?' : ''}  `).join(' AND ')} `
			const where_values = options.where.map(w => w.value)
			if(where_values.length) {
				for(const w in where_values) {
					if(where_values[w] === undefined) {
						continue;
					}
					values.push(where_values[w])
				}
			}
		}

		for(const r in options.relations) {
			if(options.relations[r].where) {
				command += `AND ${options.relations[r].where.column} ${options.relations[r].where.operator} ? `
				if(options.relations[r].where.value){
					values.push(options.relations[r].where.value)
				}
			}
		}

		return [command, values]
	}

	private fieldMapper(type: MySQLColumnType): DatabaseColumnType {
		if (type.includes('enum')) {
			return DatabaseColumnType.ENUM
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
				return DatabaseColumnType.NUMBER
			case MySQLColumnType.CHAR:
			case MySQLColumnType.VARCHAR:
			case MySQLColumnType.TEXT:
			case MySQLColumnType.TINYTEXT:
			case MySQLColumnType.MEDIUMTEXT:
			case MySQLColumnType.LONGTEXT:
			case MySQLColumnType.ENUM:
				return DatabaseColumnType.STRING
			case MySQLColumnType.DATE:
			case MySQLColumnType.DATETIME:
			case MySQLColumnType.TIME:
				return DatabaseColumnType.DATE
			case MySQLColumnType.BOOL:
			case MySQLColumnType.BOOLEAN:
				return DatabaseColumnType.BOOLEAN
			case MySQLColumnType.JSON:
				return DatabaseColumnType.JSON
			case MySQLColumnType.SET:
			case MySQLColumnType.BLOB:
			case MySQLColumnType.TINYBLOB:
			case MySQLColumnType.MEDIUMBLOB:
			case MySQLColumnType.LONGBLOB:
			case MySQLColumnType.BINARY:
			case MySQLColumnType.VARBINARY:
			default:
				return DatabaseColumnType.UNKNOWN
		}
	}

	private fieldMapperReverse(type: DatabaseColumnType): MySQLColumnType {
		switch (type) {
			case DatabaseColumnType.STRING:
				return MySQLColumnType.VARCHAR
			case DatabaseColumnType.NUMBER:
				return MySQLColumnType.INT
			case DatabaseColumnType.BOOLEAN:
				return MySQLColumnType.BOOLEAN
			case DatabaseColumnType.DATE:
				return MySQLColumnType.DATETIME
			case DatabaseColumnType.JSON:
				return MySQLColumnType.JSON
			case DatabaseColumnType.ENUM:
				return MySQLColumnType.ENUM
			default:
				return MySQLColumnType.VARCHAR
		}
	}

	private pipeObjectToMySQL(
		options: DatabaseCreateOneOptions | DatabaseUpdateOneOptions,
	): DatabaseCreateOneOptions | DatabaseUpdateOneOptions {
		for (const column of options.schema.columns) {
			if (!options.data[column.field]) {
				continue
			}

			switch (column.type) {
				case DatabaseColumnType.BOOLEAN:
					if (options.data[column.field] === true) {
						options.data[column.field] = 1
					} else if (options.data[column.field] === false) {
						options.data[column.field] = 0
					}
					break
				case DatabaseColumnType.DATE:
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

	private formatOutput(options: DatabaseFindOneOptions, data: { [key: string]: any }): object {
		//TODO: this will only work for one level deep, need to refactor to work with multiple levels

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

	private formatField(type: DatabaseColumnType, value: any): any {
		if (value === null) {
			return null
		}

		switch (type) {
			case DatabaseColumnType.BOOLEAN:
				return value === 1
			case DatabaseColumnType.DATE:
				return new Date(value).toISOString()
			default:
				return value
		}
	}

	async truncate(table_name: string): Promise<void> {
		return await this.performQuery('TRUNCATE TABLE ' + table_name)
	}
}
