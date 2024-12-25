import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as oracledb from 'oracledb'
import { Connection } from 'oracledb'

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
import { OracleColumnType } from '../types/datasources/oracle.types'
import { SortCondition } from '../types/schema.types'
import { replaceQ } from '../utils/String'

const DATABASE_TYPE = DataSourceType.ORACLE

@Injectable()
export class Oracle {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly pagination: Pagination,
	) {}

	/**
	 * Check if the data source is available
	 */
	async checkConnection(options: { x_request_id?: string }): Promise<boolean> {
		try {
			const config = {
				user: this.configService.get('database.username'),
				password: this.configService.get('database.password'),
				connectString: `${this.configService.get('database.host')}/${this.configService.get('database.database')}`
			}
			const connection = await oracledb.getConnection(config)
			await connection.close()
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
			if (!oracledb) {
				throw new Error(`${DATABASE_TYPE} library is not initialized`)
			}
			const config = {
				user: this.configService.get('database.username'),
				password: this.configService.get('database.password'),
				connectString: `${this.configService.get('database.host')}/${this.configService.get('database.database')}`
			}
			connection = await oracledb.getConnection(config)
		} catch (e) {
			this.logger.error(`[${DATABASE_TYPE}] Error creating database connection - ${e.message}`)
			throw new Error('Error creating database connection')
		}

		try {
			let results
			this.logger.debug(
				`[${DATABASE_TYPE}] ${replaceQ(options.sql, options.values || [])} ${options.x_request_id ?? ''}`,
			)

			const result = await connection.execute(options.sql, options.values || [], {
				outFormat: oracledb.OUT_FORMAT_OBJECT,
			})

			results = result.rows
			this.logger.debug(`[${DATABASE_TYPE}] Results: ${JSON.stringify(results)} - ${options.x_request_id ?? ''}`)
			await connection.close()
			return results
		} catch (e) {
			this.logger.warn(`[${DATABASE_TYPE}] Error executing query`)
			this.logger.warn({
				x_request_id: options.x_request_id,
				sql: replaceQ(options.sql, options.values || []),
				error: {
					message: e.message,
				},
			})
			await connection.close()
			throw new Error(e)
		}
	}

	/**
	 * Check if a record is unique
	 */
	async uniqueCheck(options: DataSourceUniqueCheckOptions, x_request_id: string): Promise<IsUniqueResponse> {
		for (const column of options.schema.columns) {
			if (column.unique_key) {
				const command = `SELECT COUNT(*) as total FROM ${options.schema.table} WHERE ${column.field} = :1`
				const result = await this.query({
					sql: command,
					values: [options.data[column.field]],
					x_request_id,
				})

				if (result[0].TOTAL > 0) {
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
		const columns_query = `
			SELECT 
				column_name as "FIELD",
				data_type as "TYPE",
				nullable as "NULLABLE",
				data_default as "DEFAULT",
				CASE WHEN constraint_type = 'P' THEN 'PRI'
					 WHEN constraint_type = 'U' THEN 'UNI'
					 WHEN constraint_type = 'R' THEN 'MUL'
					 ELSE NULL
				END as "KEY"
			FROM all_tab_columns 
			LEFT JOIN (
				SELECT column_name, constraint_type 
				FROM all_cons_columns 
				JOIN all_constraints ON all_cons_columns.constraint_name = all_constraints.constraint_name
				WHERE table_name = :1
			) constraints ON all_tab_columns.column_name = constraints.column_name
			WHERE table_name = :1
		`

		const columns_result = await this.query({
			sql: columns_query,
			values: [options.table.toUpperCase()],
			x_request_id: options.x_request_id,
		})

		if (!columns_result.length) {
			throw new Error(`Table ${options.table} does not exist ${options.x_request_id ?? ''}`)
		}

		const columns = columns_result.map((column: any) => {
			return <DataSourceSchemaColumn>{
				field: column.FIELD.toLowerCase(),
				type: this.columnTypeFromDataSource(column.TYPE),
				nullable: column.NULLABLE === 'Y',
				required: column.NULLABLE === 'N',
				primary_key: column.KEY === 'PRI',
				unique_key: column.KEY === 'UNI',
				foreign_key: column.KEY === 'MUL',
				default: column.DEFAULT,
			}
		})

		const relations_query = `
			SELECT 
				a.table_name as "table",
				a.column_name as "column",
				c_pk.table_name as "org_table",
				c_pk.column_name as "org_column"
			FROM all_cons_columns a
			JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
			JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
			WHERE c.constraint_type = 'R'
			AND c_pk.table_name = :1
		`

		const relations_result = await this.query({
			sql: relations_query,
			values: [options.table.toUpperCase()],
			x_request_id: options.x_request_id,
		})

		const relations = relations_result
			.filter((row: DataSourceSchemaRelation) => row.table !== null)
			.map((row: DataSourceSchemaRelation) => ({
				table: row.table.toLowerCase(),
				column: row.column.toLowerCase(),
				org_table: row.org_table.toLowerCase(),
				org_column: row.org_column.toLowerCase(),
			}))

		const relations_back_query = `
			SELECT 
				c_pk.table_name as "table",
				c_pk.column_name as "column",
				a.table_name as "org_table",
				a.column_name as "org_column"
			FROM all_cons_columns a
			JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
			JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
			WHERE c.constraint_type = 'R'
			AND a.table_name = :1
		`

		const relations_back_result = await this.query({
			sql: relations_back_query,
			values: [options.table.toUpperCase()],
			x_request_id: options.x_request_id,
		})

		const relations_back = relations_back_result
			.filter((row: DataSourceSchemaRelation) => row.table !== null)
			.map((row: DataSourceSchemaRelation) => ({
				table: row.table.toLowerCase(),
				column: row.column.toLowerCase(),
				org_table: row.org_table.toLowerCase(),
				org_column: row.org_column.toLowerCase(),
			}))

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
				// Oracle uses uppercase for system identifiers
				const columnName = column.field.toUpperCase()
				let columnType = this.columnTypeToDataSource(column.type)
				
				// For auto-increment columns, use NUMBER
				if (column.auto_increment) {
					columnType = OracleColumnType.NUMBER
				}
				
				let column_string = `"${columnName}" ${columnType}`

				// Add precision/length specifications after the type
				if (column.type === DataSourceColumnType.STRING || column.type === DataSourceColumnType.ENUM) {
					column_string += `(${column.extra?.length ?? 255})`
				} else if (column.type === DataSourceColumnType.NUMBER && column.auto_increment) {
					column_string = `"${columnName}" ${OracleColumnType.NUMBER}(38)`  // Maximum precision for auto-increment
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

				if (column.default !== null && column.default !== undefined) {
					column_string += ` DEFAULT ${column.default}`
				}

				return column_string
			})

			// Oracle defaults to uppercase, so we need to be explicit about case
			const tableName = schema.table.toUpperCase()
			
			// Drop table if it exists (to handle retries gracefully)
			await this.query({ 
				sql: `BEGIN
					EXECUTE IMMEDIATE 'DROP TABLE "${tableName}" CASCADE CONSTRAINTS';
					EXCEPTION WHEN OTHERS THEN NULL;
				END;`
			})
			
			const command = `CREATE TABLE "${tableName}" (${columns.join(', ')})`
			
			this.logger.debug(`[${DATABASE_TYPE}][createTable] Executing SQL: ${command}`, x_request_id)
			await this.query({ sql: command, x_request_id })

			// Handle auto_increment columns using sequences
			for (const column of schema.columns) {
				if (column.auto_increment) {
					const seqName = `${schema.table.toUpperCase()}_${column.field.toUpperCase()}_SEQ`
					const columnName = column.field.toUpperCase()
					
					// Drop sequence if exists (to avoid errors on retries)
					await this.query({ 
						sql: `BEGIN
							EXECUTE IMMEDIATE 'DROP SEQUENCE ${seqName}';
							EXCEPTION WHEN OTHERS THEN NULL;
						END;`
					})
					
					// Create sequence
					await this.query({ 
						sql: `CREATE SEQUENCE ${seqName} START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE` 
					})
					
					// Drop trigger if exists
					await this.query({ 
						sql: `BEGIN
							EXECUTE IMMEDIATE 'DROP TRIGGER "${schema.table.toUpperCase()}_${columnName}_TRG"';
							EXCEPTION WHEN OTHERS THEN NULL;
						END;`
					})
					
					// Create trigger
					await this.query({
						sql: `
							CREATE OR REPLACE TRIGGER "${schema.table.toUpperCase()}_${columnName}_TRG"
							BEFORE INSERT ON "${schema.table.toUpperCase()}"
							FOR EACH ROW
							BEGIN
								IF :new."${columnName}" IS NULL THEN
									SELECT ${seqName}.NEXTVAL INTO :new."${columnName}" FROM dual;
								END IF;
							END;
						`
					})
				}
			}

			// Add CHECK constraints for ENUM columns
			for (const column of schema.columns) {
				if (column.type === DataSourceColumnType.ENUM && column.enums?.length) {
					const enumValues = column.enums.map(v => `'${v}'`).join(', ')
					await this.query({
						sql: `ALTER TABLE "${schema.table.toUpperCase()}" ADD CONSTRAINT "CK_${schema.table.toUpperCase()}_${column.field.toUpperCase()}" CHECK ("${column.field}" IN (${enumValues}))`
					})
				}
			}

			if (schema.relations?.length) {
				for (const relation of schema.relations) {
					const command = `ALTER TABLE "${schema.table.toUpperCase()}" ADD CONSTRAINT "FK_${schema.table.toUpperCase()}_${relation.column.toUpperCase()}" FOREIGN KEY ("${relation.column}") REFERENCES "${relation.org_table.toUpperCase()}"("${relation.org_column}")`
					await this.query({ sql: command })
				}
			}

			return true
		} catch (e) {
			this.logger.error(
				`[${DATABASE_TYPE}][createTable] Error creating table ${schema.table}:`,
				x_request_id,
			)
			this.logger.error(`Schema: ${JSON.stringify(schema, null, 2)}`, x_request_id)
			this.logger.error(`Error: ${e.message}\n${e.stack}`, x_request_id)
			
			// Log the actual SQL that failed
			const columnDefinitions = schema.columns.map(column => {
				const columnName = column.field.toUpperCase()
				let columnType = this.columnTypeToDataSource(column.type)
				if (column.auto_increment) {
					columnType = OracleColumnType.NUMBER
				}
				return `"${columnName}" ${columnType}`
			}).join(', ')
			
			this.logger.error(
				`[${DATABASE_TYPE}][createTable] Attempted SQL: CREATE TABLE "${schema.table.toUpperCase()}" (${columnDefinitions})`,
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
			const results = await this.query({
				sql: 'SELECT table_name FROM user_tables',
				x_request_id: options.x_request_id,
			})
			const tables = results.map(row => row.TABLE_NAME.toLowerCase())
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

		const command = `INSERT INTO "${table_name}" ("${columns.join('", "')}") VALUES (${values.map((_, i) => `:${i + 1}`).join(', ')}) RETURNING *`

		const result = await this.query({ sql: command, values, x_request_id })

		return this.pipeObjectFromDataSource(options, result[0])
	}

	/**
	 * Find single record
	 */
	async findOne(options: DataSourceFindOneOptions, x_request_id: string): Promise<FindOneResponseObject | undefined> {
		let [command, values] = this.find(options)
		command += ` FETCH FIRST 1 ROWS ONLY`

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

			command = `
				SELECT a.*, ROWNUM rnum
				FROM (
					${command}
				) a
				WHERE ROWNUM <= ${options.offset + options.limit}
			`

			command = `
				SELECT *
				FROM (${command})
				WHERE rnum > ${options.offset}
			`

			results = await this.query({ sql: command, values, x_request_id })

			for (const r in results) {
				delete results[r].RNUM
				results[r] = this.pipeObjectFromDataSource(options, results[r])
			}
		}

		const limit = options.limit || this.configService.get<number>('database.defaults.limit') || 20
		const offset = options.offset || 0

		return {
			limit,
			offset,
			total,
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
			data: results,
		}
	}

	/**
	 * Get total records with where conditions
	 */
	async findTotalRecords(options: DataSourceFindTotalRecords, x_request_id: string): Promise<number> {
		let [command, values] = this.find(options, true)
		const results = await this.query({ sql: command, values, x_request_id })
		return Number(results[0].TOTAL)
	}

	/**
	 * Update one record
	 */
	async updateOne(options: DataSourceUpdateOneOptions, x_request_id: string): Promise<FindOneResponseObject> {
		const table_name = options.schema.table

		options = this.pipeObjectToDataSource(options) as DataSourceUpdateOneOptions

		const values = [...Object.values(options.data), options.id.toString()]
		let command = `UPDATE "${table_name}" SET `

		command += `${Object.keys(options.data)
			.map((key, index) => `"${key}" = :${index + 1}`)
			.join(', ')} `

		command += `WHERE "${options.schema.primary_key}" = :${Object.keys(options.data).length + 1}`

		await this.query({ sql: command, values, x_request_id })

		const result = await this.findOne(
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

		if (!result) {
			throw new Error(`Record not found after update`)
		}

		return result
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
		let command = `DELETE FROM "${table_name}" `

		command += `WHERE "${options.schema.primary_key}" = :1`

		const result = await this.query({ sql: command, values, x_request_id })

		return {
			deleted: result.rowsAffected,
		}
	}

	/**
	 * Truncate table
	 */
	async truncate(table: string): Promise<void> {
		return await this.query({ sql: 'TRUNCATE TABLE "' + table + '"' })
	}

	/**
	 * Convert Oracle column type to DataSourceColumnType
	 */
	private columnTypeFromDataSource(type: OracleColumnType): DataSourceColumnType {
		if (type.includes('NUMBER') && type.includes('(1)')) {
			return DataSourceColumnType.BOOLEAN
		}

		switch (type) {
			case OracleColumnType.NUMBER:
			case OracleColumnType.INTEGER:
			case OracleColumnType.FLOAT:
			case OracleColumnType.DOUBLE:
			case OracleColumnType.DECIMAL:
				return DataSourceColumnType.NUMBER
			case OracleColumnType.VARCHAR2:
			case OracleColumnType.NVARCHAR2:
			case OracleColumnType.CHAR:
			case OracleColumnType.NCHAR:
			case OracleColumnType.CLOB:
			case OracleColumnType.NCLOB:
			case OracleColumnType.LONG:
				return DataSourceColumnType.STRING
			case OracleColumnType.DATE:
			case OracleColumnType.TIMESTAMP:
				return DataSourceColumnType.DATE
			case OracleColumnType.JSON:
				return DataSourceColumnType.JSON
			case OracleColumnType.BLOB:
			case OracleColumnType.RAW:
			case OracleColumnType.LONG_RAW:
			default:
				return DataSourceColumnType.UNKNOWN
		}
	}

	/**
	 * Convert DataSourceColumnType to Oracle column type
	 */
	private columnTypeToDataSource(type: DataSourceColumnType): OracleColumnType {
		switch (type) {
			case DataSourceColumnType.STRING:
				return OracleColumnType.VARCHAR2
			case DataSourceColumnType.NUMBER:
				return OracleColumnType.NUMBER
			case DataSourceColumnType.BOOLEAN:
				return OracleColumnType.BOOLEAN  // Already defined as NUMBER(1)
			case DataSourceColumnType.DATE:
				return OracleColumnType.TIMESTAMP
			case DataSourceColumnType.JSON:
				return OracleColumnType.JSON
			case DataSourceColumnType.ENUM:
				return OracleColumnType.VARCHAR2
			default:
				return OracleColumnType.VARCHAR2
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
				column = options.schema.columns.find(c => c.field === key.toLowerCase())
			}

			if (!column) continue

			switch (column.type) {
				case DataSourceColumnType.BOOLEAN:
					data[key] = data[key] === 1
					break
				case DataSourceColumnType.DATE:
					if (data[key]) {
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
	 * Oracle specific helper function to build the find query
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

			command += `${options.where
				.map(w => {
					const columnName = w.column.includes('.') ? w.column : `"${table_name}"."${w.column}"`
					if (w.operator === WhereOperator.not_null || w.operator === WhereOperator.null) {
						return `${columnName} ${w.operator}`
					} else if (w.operator === WhereOperator.search) {
						values.push(w.value)
						return `${columnName} LIKE :${values.length}`
					} else {
						values.push(w.value)
						return `${columnName} ${w.operator} :${values.length}`
					}
				})
				.join(' AND ')} `
		}

		return [command.trim(), values]
	}
}
