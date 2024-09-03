import { Injectable } from '@nestjs/common'
import { Logger } from './Logger'
import { DatabaseSchema, DatabaseType, WhereOperator } from '../types/database.types'
import { ConfigService } from '@nestjs/config'
import { MySQL } from '../databases/mysql.database'
import {
	ValidateFieldsResponse,
	validateRelationsResponse,
	ValidateResponse,
	validateWhereResponse,
} from '../types/schema.types'
import { NON_FIELD_PARAMS } from '../app.constants'

@Injectable()
export class Schema {
	constructor(
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly mysql: MySQL,
	) {}

	/**
	 * Get Table Schema
	 */

	async getSchema(table_name: string): Promise<DatabaseSchema> {
		try {
			switch (this.configService.get<string>('database.type')) {
				case DatabaseType.MYSQL:
					return await this.mysql.getSchema(table_name)
				default:
					this.logger.error(
						`[Query][GetSchema] Database type ${this.configService.get<string>('database.type')} not supported yet`,
					)
			}
		} catch (e) {
			this.logger.error(`[Query][GetSchema] ${e.message}`)
			throw new Error(`Table schema not found for table ${table_name}`)
		}
	}

	/**
	 * The primary key's name of the table
	 */
	getPrimaryKey(schema: DatabaseSchema): string {
		return schema.columns.find(column => {
			if (column.primary_key) {
				return column
			}
		}).field
	}

	validateColumnData(schema: DatabaseSchema, column: string, value: any): { valid: boolean; message?: string } {
		const col = schema.columns.find(col => col.field === column)

		if (!col) {
			return {
				valid: false,
				message: `Column ${column} not found in schema`,
			}
		}

		if (col.type.includes('int')) {
			if (isNaN(parseInt(value))) {
				return {
					valid: false,
					message: `Invalid integer ${value} for column ${col.field}`,
				}
			}
		} else if (
			col.type.includes('varchar') ||
			col.type.includes('text') ||
			col.type.includes('char') ||
			col.type.includes('enum')
		) {
			if (typeof value !== 'string') {
				return {
					valid: false,
					message: `Invalid varchar ${value} for column ${col.field}`,
				}
			}
		} else {
			console.error(`[validateColumnData] Column type ${col.type} not integrated`)
			return {
				valid: false,
				message: `System Erorr: Column type ${col.type} not integrated`,
			}
		}

		return {
			valid: true,
		}
	}

	validateFields(schema: DatabaseSchema, fields: string): ValidateFieldsResponse {
		try {
			const params = fields.split(',').filter(field => !field.includes('.'))
			const params_relations = fields.split(',').filter(field => field.includes('.'))

			for (const field of params) {
				if (!schema.columns.find(col => col.field === field)) {
					return {
						valid: false,
						message: `Field ${field} not found in table schema for ${schema.table}`,
					}
				}
			}

			const relations = []

			for (const relation of params_relations) {
				relations.push(relation.split('.')[0])
			}

			return {
				valid: true,
				params,
				relations,
			}
		} catch (e) {
			this.logger.debug(`[validateFields] ${e.message}`)
			return {
				valid: false,
				message: `Error parsing fields ${fields}`,
			}
		}
	}

	/**
	 * Validate relations by ensuring that the relation exists in the schema
	 */

	async validateRelations(schema: DatabaseSchema, relations: string[]): Promise<validateRelationsResponse> {
		try {
			for (const relation of relations) {
				if (!schema.relations.find(col => col.table === relation)) {
					return {
						valid: false,
						message: `Relation ${relation} not found in table schema for ${schema.table} `,
					}
				}
				schema.relations.find(col => col.table === relation).schema = await this.getSchema(relation)
			}

			return {
				valid: true,
				schema: schema,
			}
		} catch (e) {
			this.logger.debug(`[validateRelations] ${e.message}`)
			return {
				valid: false,
				message: `Error parsing relations ${relations}`,
			}
		}
	}

	/**
	 * Validate params for where builder, format is column[operator]=value with operator being from the enum WhereOperator
	 *
	 * Example: ?id[equals]=1&name=John&age[gte]=21
	 */

	validateWhereParams(schema: DatabaseSchema, params: any): validateWhereResponse {
		const where = []

		for (const param in params) {
			if (NON_FIELD_PARAMS.includes(param)) continue

			const [column] = param.split('[').filter(part => part !== '')
			let [operator] = param.split('[').filter(part => part !== '')

			if (!operator) {
				operator = 'equals'
			}

			if (column.includes('.')) {
				continue
			}

			const value = params[param]

			if (!schema.columns.find(col => col.field === column)) {
				return {
					valid: false,
					message: `Column ${column} not found in schema`,
				}
			}

			if (!Object.values(WhereOperator).includes(WhereOperator[operator])) {
				return {
					valid: false,
					message: `Operator ${operator} not found`,
				}
			}

			const validation = this.validateColumnData(schema, column, value)

			if (!validation.valid) {
				return validation
			}

			where.push({
				column,
				operator: WhereOperator[operator],
				value,
			})
		}

		return {
			valid: true,
			where,
		}
	}

	/**
	 * Validate order params, format is sort={column}.{operator},column.{operator},...
	 *
	 * Operator is either `asc` or `desc`
	 *
	 * Example: ?sort=name.asc,id.desc,content.title.asc
	 */

	validateOrder(schema: DatabaseSchema, sort: string): ValidateResponse {
		const array = sort.split(',').filter(sort => !sort.includes('.'))

		for (const item of array) {
			const direction = item.lastIndexOf('.')

			if (direction === -1) {
				return {
					valid: false,
					message: `Invalid order param ${item}, missing direction, must be either ${item}.asc or ${item}.desc`,
				}
			}

			const operator = item.substring(direction)

			if (operator !== 'asc' && operator !== 'desc') {
				return {
					valid: false,
					message: `Invalid order operator ${operator}, must be either asc or desc`,
				}
			}

			const column = item.substring(0, direction)

			if (!schema.columns.find(col => col.field === column)) {
				return {
					valid: false,
					message: `Column ${column} not found in schema`,
				}
			}
		}

		return {
			valid: true,
		}
	}
}
