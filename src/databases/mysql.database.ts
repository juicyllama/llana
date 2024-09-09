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
	DatabaseWhere,
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
			this.logger.debug(`[MySQL][Query] ${sql}`)

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
			primary_key: columns.find(column => column.primary_key).field,
			columns,
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

		results[0] = this.pipeMySQLToObject({ schema: options.schema, data: results[0] })

		if (!options.joins) {
			return await this.addRelations(options, results[0])
		} else {
			return results[0]
		}
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
			results[r] = this.pipeMySQLToObject({ schema: options.schema, data: results[r] })
			results[r] = await this.addRelations(options, results[r])
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
		const table_name = options.schema.table

		const values: any[] = []
		let command = `SELECT COUNT(*) as total FROM ${table_name} `

		const where = options.where?.filter(where => !where.column.includes('.'))

		if (where?.length) {
			command += `WHERE `

			for (const w in where) {
				if (where[w].operator === WhereOperator.search) {
					where[w].value = '%' + where[w].value + '%'
				}
			}

			command += `${where.map(w => `\`${w.column}\` ${w.operator === WhereOperator.search ? 'LIKE' : w.operator} ${w.operator !== WhereOperator.not_null && w.operator !== WhereOperator.null ? '?' : ''} `).join(' AND ')} `
			values.push(...where.map(w => w.value))
		}

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

	private async addRelations(options: DatabaseFindOneOptions | DatabaseFindManyOptions, result: any): Promise<any> {
		if (!result) return {}

		if (options.relations?.length) {
			for (const relation of options.relations) {
				const schema_relation = options.schema.relations.find(r => r.table === relation).schema
				const relation_table = options.schema.relations.find(r => r.table === relation)
				const fields = options.fields?.filter(field => field.includes(schema_relation.table + '.'))

				if (fields.length) {
					fields.forEach((field, index) => {
						fields[index] = field.replace(`${schema_relation.table}.`, '')
					})
				}

				if (!fields.length) {
					fields.push(...schema_relation.columns.map(column => column.field))
				}

				const limit = this.configService.get<number>('database.defaults.relations.limit')

				let where: DatabaseWhere[] = [
					{
						column: relation_table.column,
						operator: WhereOperator.equals,
						value: result[relation_table.org_column],
					},
				]

				if ('where' in options && options.where) {
					where = where.concat(
						options.where?.filter(where => where.column.includes(schema_relation.table + '.')),
					)

					for (const w of where) {
						w.column = w.column.replace(`${schema_relation.table}.`, '')
					}
				}

				let sort: SortCondition[] = []
				if ('sort' in options && options.sort) {
					sort = options.sort?.filter(sort => sort.column.includes(schema_relation.table + '.'))
					for (const s of sort) {
						s.column = s.column.replace(`${schema_relation.table}.`, '')
					}
				}

				const relation_result = await this.findMany({
					schema: schema_relation,
					fields,
					where,
					sort,
					limit,
					offset: 0,
				})

				result[relation] = relation_result.data
			}
		}
		return result
	}

	private find(options: DatabaseFindOneOptions | DatabaseFindManyOptions): [string, string[]] {
		const table_name = options.schema.table
		let values: any[] = []

		const fields = options.joins ? options.fields : options.fields?.filter(field => !field.includes('.'))
		const where = options.joins ? options.where : options.where?.filter(where => !where.column.includes('.'))

		for (const f in fields) {
			if (!fields[f].includes('.')) {
				fields[f] = `${table_name}.` + fields[f]
			}
		}

		let command = `SELECT ${fields?.length ? fields.join(`, `) : '*'} `

		command += `FROM ${table_name} `

		if (options.joins && options.relations?.length) {
			for (const relation of options.relations) {
				const schema_relation = options.schema.relations.find(r => r.table === relation)
				command += `LEFT JOIN ${schema_relation.table} ON ${schema_relation.org_table}.${schema_relation.org_column} = ${schema_relation.table}.${schema_relation.column} `
			}
		}

		if (where?.length) {
			command += `WHERE `

			for (const w in where) {
				if (where[w].operator === WhereOperator.search) {
					where[w].value = '%' + where[w].value + '%'
				}
			}

			command += `${where.map(w => `${w.column.includes('.') ? w.column : table_name + '.' + w.column} ${w.operator === WhereOperator.search ? 'LIKE' : w.operator} ${w.operator !== WhereOperator.not_null && w.operator !== WhereOperator.null ? '?' : ''}  `).join(' AND ')} `
			values.push(...where.map(w => w.value))
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

	private pipeMySQLToObject(options: { schema: DatabaseSchema; data: { [key: string]: any } }): object {
		for (const column of options.schema.columns) {
			if (!options.data[column.field]) {
				continue
			}

			switch (column.type) {
				case DatabaseColumnType.BOOLEAN:
					if (options.data[column.field] === 1) {
						options.data[column.field] = true
					} else if (options.data[column.field] === 0) {
						options.data[column.field] = false
					}
					break
				case DatabaseColumnType.DATE:
					if (options.data[column.field]) {
						options.data[column.field] = new Date(options.data[column.field]).toISOString()
					}
					break
				default:
					continue
			}
		}

		return options.data
	}
}
