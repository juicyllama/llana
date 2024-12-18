import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'
import { plainToInstance } from 'class-transformer'
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, validate } from 'class-validator'
import { isDate, isObject } from 'lodash'

import { CACHE_DEFAULT_TABLE_SCHEMA_TTL, NON_FIELD_PARAMS } from '../app.constants'
import { Airtable } from '../datasources/airtable.datasource'
import { Mongo } from '../datasources/mongo.datasource'
import { MSSQL } from '../datasources/mssql.datasource'
import { MySQL } from '../datasources/mysql.datasource'
import { Postgres } from '../datasources/postgres.datasource'
import {
	DataSourceColumnType,
	DataSourceFindOneOptions,
	DataSourceoinType,
	DataSourceRelations,
	DataSourceSchema,
	DataSourceType,
	DataSourceWhere,
	WhereOperator,
} from '../types/datasource.types'
import {
	SortCondition,
	ValidateFieldsResponse,
	validateRelationsResponse,
	ValidateSortResponse,
	validateWhereResponse,
} from '../types/schema.types'
import { Logger } from './Logger'

@Injectable()
export class Schema {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly postgres: Postgres,
		private readonly mongo: Mongo,
		private readonly mysql: MySQL,
		private readonly mssql: MSSQL,
		private readonly airtable: Airtable,
	) {}

	/**
	 * Get Table Schema
	 */

	async getSchema(options: { table: string; x_request_id?: string }): Promise<DataSourceSchema> {
		if (!options.table) {
			throw new Error('Table name not provided')
		}

		//check cache for schema
		let result: DataSourceSchema = await this.cacheManager.get(`schema:${options.table}`)

		if (result?.table) {
			this.logger.debug(`[GetSchema] Cache hit for ${options.table} ${options.x_request_id ?? ''}`)
			return {
				...result,
				_x_request_id: options.x_request_id,
			}
		}

		try {
			switch (this.configService.get<string>('database.type')) {
				case DataSourceType.MYSQL:
					result = await this.mysql.getSchema({ table: options.table, x_request_id: options.x_request_id })
					break
				case DataSourceType.POSTGRES:
					result = await this.postgres.getSchema({ table: options.table, x_request_id: options.x_request_id })
					break
				case DataSourceType.MONGODB:
					result = await this.mongo.getSchema({ table: options.table, x_request_id: options.x_request_id })
					break
				case DataSourceType.MSSQL:
					result = await this.mssql.getSchema({ table: options.table, x_request_id: options.x_request_id })
					break
				case DataSourceType.AIRTABLE:
					result = await this.airtable.getSchema({ table: options.table, x_request_id: options.x_request_id })
					break
				default:
					this.logger.error(
						`[GetSchema] Database type ${this.configService.get<string>('database.type')} not supported yet`,
						options.x_request_id,
					)
			}

			if (!result?.table) {
				throw new Error(`Schema not found for ${options.table}`)
			}

			await this.cacheManager.set(
				`schema:${options.table}`,
				result,
				this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL,
			)

			return {
				...result,
				_x_request_id: options.x_request_id,
			}
		} catch (e) {
			this.logger.debug(`[GetSchema] ${e.message} ${options.x_request_id ?? ''}`)
			throw new Error(`Error processing schema for ${options.table}`)
		}
	}

	/**
	 * The primary key's name of the table
	 */
	getPrimaryKey(schema: DataSourceSchema): string {
		return schema.columns.find(column => {
			if (column.primary_key) {
				return column
			}
		}).field
	}

	/**
	 * Get the class for the schema
	 */

	schemaToClass(schema: DataSourceSchema, data?: { [key: string]: any }): any {
		class DynamicClass {}

		for (const column of schema.columns) {
			const decorators = []

			if (data && !data[column.field]) {
				continue
			}

			if (column.primary_key) {
				decorators.push(IsOptional())
				continue
			}

			switch (column.type) {
				case DataSourceColumnType.NUMBER:
					decorators.push(IsNumber())
					break
				case DataSourceColumnType.STRING:
					decorators.push(IsString())
					break
				case DataSourceColumnType.BOOLEAN:
					decorators.push(IsBoolean())
					break
				case DataSourceColumnType.DATE:
					decorators.push(IsDateString())
					break
				case DataSourceColumnType.JSON:
					//decorators.push(IsJSON()) //breaks nested objects
					break
				default:
					break
			}

			if (!column.required) {
				decorators.push(IsOptional())
			}

			Reflect.decorate(decorators, DynamicClass.prototype, column.field)
		}

		return DynamicClass
	}

	/**
	 * Pipe response from database to class
	 *
	 * This function takes the flat datasource response e.g. { id: 1, name: 'Jon', job.id: '1' job.title: 'Developer' } and pipes it to the classes:
	 * { id: 1, name: 'Jon', job: { id: 1, title: 'Developer' } }
	 *
	 */

	async pipeResponse(
		options: DataSourceFindOneOptions,
		data: { [key: string]: any },
		x_request_id?: string,
	): Promise<object> {
		const nestedObject = {}

		//if Buffer convert to string
		Object.keys(data).forEach(key => {
			if (data[key] instanceof Buffer) {
				data[key] = data[key].toString()
			}
		})

		Object.keys(data).forEach(key => {
			const keys = key.split('.')
			keys.reduce((acc, currentKey, index) => {
				if (index === keys.length - 1) {
					acc[currentKey] = data[key]
				} else {
					acc[currentKey] = acc[currentKey] || {}
				}
				return acc[currentKey]
			}, nestedObject)
		})

		//Loop over the nested object and create the class if the key is an object

		if (options.relations) {
			const keys = Object.keys(nestedObject)
			for (const key of keys) {
				if (isObject(nestedObject[key]) && !isDate(nestedObject[key])) {
					const relation = options.relations?.find(col => col.table === key)
					if (relation) {
						const DynamicClass = this.schemaToClass(relation.schema, nestedObject[key])
						const instance: object = plainToInstance(DynamicClass, nestedObject[key])
						try {
							const errors = await validate(instance)

							if (errors.length > 0) {
								this.logger.error(
									`[pipeResponse] ${Object.values(errors[0].constraints).join(', ')}`,
									x_request_id,
								)
								this.logger.error({
									data,
									instance,
									errors,
								})
								throw new Error(
									`Error piping response - ${Object.values(errors[0].constraints).join(', ')}`,
								)
							} else {
								nestedObject[key] = instance
							}
						} catch (e) {
							throw new Error(e.message)
						}
					}
				}
			}
		}

		const DynamicClass = this.schemaToClass(options.schema, nestedObject)
		const instance: object = plainToInstance(DynamicClass, nestedObject)
		try {
			const errors = await validate(instance)

			if (errors.length > 0) {
				this.logger.error(`[pipeResponse] ${Object.values(errors[0].constraints).join(', ')}`, x_request_id)
				this.logger.error({
					data,
					instance,
					errors,
				})
				throw new Error(`Error piping response - ${Object.values(errors[0].constraints).join(', ')}`)
			}
		} catch (e) {
			throw new Error(e.message)
		}

		return instance
	}

	/**
	 * validate schema fields with data
	 */

	async validateData(
		schema: DataSourceSchema,
		data: { [key: string]: any },
	): Promise<{ valid: boolean; message?: string; instance?: object }> {
		try {
			const validatedData = { ...data }
			for (const key in validatedData) {
				const column = schema.columns.find(col => col.field === key)

				// Skip validation for unknown columns and auto-increment primary keys
				if (!column) {
					return {
						valid: false,
						message: `Unknown column: ${key}`,
					}
				}

				if (column.primary_key && column.auto_increment) {
					continue;
				}

				// Handle type conversions before validation
				switch (column.type) {
					case DataSourceColumnType.NUMBER:
						// Handle numeric conversions
						if (typeof validatedData[key] === 'string') {
							const num = Number(validatedData[key])
							if (isNaN(num)) {
								return {
									valid: false,
									message: `${key} must be a number`,
								}
							}
							validatedData[key] = num
						} else if (typeof validatedData[key] === 'boolean') {
							validatedData[key] = validatedData[key] ? 1 : 0
						} else if (typeof validatedData[key] !== 'number' || isNaN(validatedData[key])) {
							return {
								valid: false,
								message: `${key} must be a number`,
							}
						}
						break
					default:
						break
				}
			}

			const DynamicClass = this.schemaToClass(schema, validatedData)
			const instance: object = plainToInstance(DynamicClass, validatedData)
			const errors = await validate(instance)

			if (errors.length > 0) {
				return {
					valid: false,
					message: Object.values(errors[0].constraints).join(', '),
				}
			}

			return {
				valid: true,
				instance: validatedData,
			}
		} catch (e) {
			return {
				valid: false,
				message: e.message || 'Validation error',
			}
		}
	}

	async validateFields(options: {
		schema: DataSourceSchema
		fields: string[]
		x_request_id?: string
	}): Promise<ValidateFieldsResponse> {
		try {
			const validated: string[] = []
			let relations: DataSourceRelations[] = []

			for (const field of options.fields) {
				if (field === '') {
					continue
				}

				if (field.includes('.')) {
					relations = await this.convertDeepField({
						field,
						schema: options.schema,
						relations,
						x_request_id: options.x_request_id,
					})
				} else {
					if (this.validateField(options.schema, field)) {
						validated.push(field)
					} else {
						return {
							valid: false,
							message: `Field ${field} not found in table schema for ${options.schema.table}`,
						}
					}
				}
			}

			return {
				valid: true,
				fields: validated,
				relations,
			}
		} catch (e) {
			this.logger.debug(`[validateFields] ${e.message}`, options.x_request_id)
			return {
				valid: false,
				message: `Error parsing fields ${options.fields}`,
			}
		}
	}

	validateField(schema: DataSourceSchema, field: string): boolean {
		return schema.columns.find(col => col.field === field) ? true : false
	}

	/**
	 * Validate relations by ensuring that the relation exists in the schema
	 */

	async validateRelations(options: {
		schema: DataSourceSchema
		relation_query: string[]
		existing_relations: DataSourceRelations[]
		x_request_id?: string
	}): Promise<validateRelationsResponse> {
		try {
			const relations = options.relation_query
			const validated: DataSourceRelations[] = []

			for (const relation of relations) {
				if (relation.includes('.')) {
					const relations = await this.convertDeepRelation({
						relation,
						schema: options.schema,
						x_request_id: options.x_request_id,
					})

					for (const rel of relations) {
						if (options.existing_relations.find(relation => relation.table === rel.table)) {
							continue
						}
						validated.push(rel)
					}
				} else {
					if (!options.schema.relations.find(col => col.table === relation)) {
						return {
							valid: false,
							message: `Relation ${relation} not found in table schema for ${options.schema.table} `,
						}
					}

					if (options.existing_relations.find(rel => rel.table === relation)) {
						continue
					}

					const relation_schema = await this.getSchema({
						table: relation,
						x_request_id: options.x_request_id,
					})

					validated.push({
						table: relation,
						join: {
							...options.schema.relations.find(col => col.table === relation),
							type: DataSourceoinType.INNER,
						},
						columns: relation_schema.columns.map(col => col.field),
						schema: relation_schema,
					})
				}
			}

			return {
				valid: true,
				relations: validated,
			}
		} catch (e) {
			this.logger.debug(`[validateRelations] ${e.message}`, options.x_request_id)
			return {
				valid: false,
				message: `Error parsing relations ${options.relation_query}`,
			}
		}
	}

	/**
	 * Validate params for where builder, format is column[operator]=value with operator being from the enum WhereOperator
	 *
	 * Example: ?id[equals]=1&name=John&age[gte]=21
	 */

	async validateWhereParams(options: { schema: DataSourceSchema; params: any }): Promise<validateWhereResponse> {
		const where: DataSourceWhere[] = []

		for (const param in options.params) {
			if (NON_FIELD_PARAMS.includes(param)) continue

			const column = param

			let operator: WhereOperator
			let value: any

			switch (typeof options.params[param]) {
				case 'string':
					operator = WhereOperator.equals
					value = options.params[param]
					break
				case 'object':
					const operators = Object.keys(options.params[param]) as WhereOperator[]
					operator = operators[0]

					if (!operator) {
						operator = WhereOperator.equals
					}
					value = options.params[param][operator]
					operator = WhereOperator[operator]
					break

				default:
					return {
						valid: false,
						message: `Invalid where param ${param}`,
					}
			}

			if (column.includes('.')) {
				continue
			}

			if (!options.schema.columns.find(col => col.field === column)) {
				return {
					valid: false,
					message: `Column ${column} not found in schema`,
				}
			}

			if (!Object.values(WhereOperator).includes(operator)) {
				return {
					valid: false,
					message: `Operator ${operator} not found`,
				}
			}

			const validation = await this.validateData(options.schema, { [column]: value })

			if (!validation.valid) {
				return validation
			}

			where.push({
				column,
				operator,
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

	validateSort(options: { schema: DataSourceSchema; sort: string[] }): ValidateSortResponse {
		const array = options.sort?.filter(sort => !sort.includes('.'))

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

			if (!options.schema.columns.find(col => col.field === column)) {
				return {
					valid: false,
					message: `Column ${column} not found in schema`,
				}
			}
		}

		return {
			valid: true,
			sort: this.createSortArray(options.sort),
		}
	}

	/**
	 * Convert where into where and relations
	 */

	async convertDeepWhere(options: {
		where: DataSourceWhere
		schema: DataSourceSchema
		x_request_id?: string
	}): Promise<DataSourceRelations[]> {
		const relations: DataSourceRelations[] = []

		//deconstruct the column to create the relations of each table in the items object
		let items = options.where.column.split('.')

		for (let i = 0; i < items.length - 1; i++) {
			if (!options.schema.relations.find(col => col.table === items[i])) {
				this.logger.error(
					`Relation ${items[i]} not found in schema for ${options.schema.table}`,
					options.x_request_id,
				)
				this.logger.error(options)
				throw new Error(`Relation ${items[i]} not found in schema for ${options.schema.table}`)
			}

			const relation_schema = await this.getSchema({ table: items[i], x_request_id: options.x_request_id })

			const relation = {
				table: items[i],
				join: {
					...options.schema.relations.find(col => col.table === items[i]),
					type: DataSourceoinType.INNER,
				},
				where: i === items.length - 2 ? options.where : undefined,
				schema: relation_schema,
			}

			relations.push(relation)

			options.schema = relation_schema
		}

		return relations
	}

	/**
	 * Convert where into where and relations
	 */

	async convertDeepField(options: {
		field: string
		schema: DataSourceSchema
		relations: DataSourceRelations[]
		x_request_id?: string
	}): Promise<DataSourceRelations[]> {
		//deconstruct the column to create the relations of each table in the items object
		let items = options.field.split('.')

		for (let i = 0; i < items.length - 1; i++) {
			if (!options.schema.relations.find(col => col.table === items[i])) {
				this.logger.error(
					`Relation ${items[i]} not found in schema for ${options.schema.table}`,
					options.x_request_id,
				)
				this.logger.error(options)
				throw new Error(`Relation ${items[i]} not found in schema for ${options.schema.table}`)
			}

			const relation_schema = await this.getSchema({ table: items[i], x_request_id: options.x_request_id })

			if (options.relations.find(rel => rel.table === items[i])) {
				const index = options.relations.findIndex(rel => rel.table === items[i])
				if (i === items.length - 2) {
					options.relations[index].columns.push(items[items.length - 1])
				}
			} else {
				options.relations.push({
					table: items[i],
					join: {
						...options.schema.relations.find(col => col.table === items[i]),
						type: DataSourceoinType.INNER,
					},
					columns: i === items.length - 2 ? [items[items.length - 1]] : undefined,
					schema: relation_schema,
				})
			}

			options.schema = relation_schema
		}

		return options.relations
	}

	/**
	 * Convert relation into relations
	 */

	async convertDeepRelation(options: {
		relation: string
		schema: DataSourceSchema
		x_request_id?: string
	}): Promise<DataSourceRelations[]> {
		const relations: DataSourceRelations[] = []

		//deconstruct the column to create the relations of each table in the items object
		let items = options.relation.split('.')

		for (let i = 0; i < items.length - 1; i++) {
			if (!options.schema.relations.find(col => col.table === items[i])) {
				this.logger.error(
					`Relation ${items[i]} not found in schema for ${options.schema.table}`,
					options.x_request_id,
				)
				this.logger.error(options)
				throw new Error(`Relation ${items[i]} not found in schema for ${options.schema.table}`)
			}

			const relation_schema = await this.getSchema({ table: items[i], x_request_id: options.x_request_id })

			relations.push({
				table: items[i],
				join: {
					...options.schema.relations.find(col => col.table === items[i]),
					type: DataSourceoinType.INNER,
				},
				columns: i === items.length - 1 ? [items[items.length]] : undefined,
				schema: relation_schema,
			})

			options.schema = relation_schema
		}

		return relations
	}

	/**
	 * Takes the sort query parameter and returns the sort object
	 */

	createSortArray(sort: string[]): SortCondition[] {
		if (!sort) return []

		const sortArray = []

		for (const item of sort) {
			const direction = item.lastIndexOf('.')
			const column = item.substring(0, direction)
			const operator = item.substring(direction + 1)
			sortArray.push({ column, operator: operator.toUpperCase() })
		}

		return sortArray
	}
}
