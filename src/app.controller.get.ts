import { Controller, Get, Headers, Param, ParseArrayPipe, Query as QueryParams, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { LLANA_WEBHOOK_TABLE } from './app.constants'
import { FindManyQueryParams, HeaderParams } from './dtos/requests.dto'
import { FindManyResponseObject, FindOneResponseObject, ListTablesResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Pagination } from './helpers/Pagination'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import {
	DataSourceFindManyOptions,
	DataSourceFindOneOptions,
	DataSourceSchema,
	QueryPerform,
	WhereOperator,
} from './types/datasource.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class GetController {
	constructor(
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		private readonly pagination: Pagination,
		private readonly query: Query,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly schema: Schema,
	) {}

	@Get('/tables')
	async listTables(@Req() req, @Res() res, @Headers() headers: HeaderParams): Promise<DataSourceSchema> {
		const x_request_id = headers['x-request-id']

		const auth = await this.authentication.auth({
			table: '',
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
			skip_table_checks: true,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		return res.status(200).send(await this.query.perform(QueryPerform.LIST_TABLES, undefined, x_request_id))
	}

	@Get('*/schema')
	async getSchema(@Req() req, @Res() res, @Headers() headers: HeaderParams): Promise<ListTablesResponseObject> {
		const x_request_id = headers['x-request-id']

		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DataSourceSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		//perform role check
		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission({
				identifier: auth.user_identifier,
				table: table_name,
				access: RolePermission.READ,
				x_request_id,
			})

			if (!permission.valid) {
				return res.status(401).send(this.response.text((permission as AuthTablePermissionFailResponse).message))
			}
		}

		return res.status(200).send(schema)
	}

	@Get('*/:id')
	async getById(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@Param('id') id: string,
		@QueryParams('fields', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		queryFields?: string[],
		@QueryParams('relations', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		queryRelations?: string[],
	): Promise<FindOneResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let primary_key

		const options: DataSourceFindOneOptions = {
			schema: null,
			fields: [],
			where: [],
			relations: [],
		}

		const postQueryRelations = []

		try {
			options.schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		try {
			//perform role check
			if (auth.user_identifier) {
				let permission = await this.roles.tablePermission({
					identifier: auth.user_identifier,
					table: table_name,
					access: RolePermission.READ,
					x_request_id,
				})

				if (!permission.valid) {
					return res
						.status(401)
						.send(this.response.text((permission as AuthTablePermissionFailResponse).message))
				}

				if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
					permission = permission as AuthTablePermissionSuccessResponse

					if (permission.restriction.column.includes('.')) {
						options.relations.concat(
							await this.schema.convertDeepWhere({
								where: permission.restriction,
								schema: options.schema,
								x_request_id,
							}),
						)
					} else {
						options.where.push(permission.restriction)
					}
				}
			}

			//validate :id field
			primary_key = this.schema.getPrimaryKey(options.schema)

			if (!primary_key) {
				return res.status(400).send(this.response.text(`No primary key found for table ${table_name}`))
			}

			const validateKey = await this.schema.validateData(options.schema, { [primary_key]: id })
			if (!validateKey.valid) {
				return res.status(400).send(this.response.text(validateKey.message))
			}

			if (queryFields?.length) {
				const { valid, message, fields, relations } = await this.schema.validateFields({
					schema: options.schema,
					fields: queryFields,
					x_request_id,
				})
				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				for (const field of fields) {
					if (!options.fields.includes(field)) {
						options.fields.push(field)
					}
				}

				for (const relation of relations) {
					if (!postQueryRelations.find(r => r.table === relation.table)) {
						postQueryRelations.push(relation)
					}
				}
			}

			if (queryRelations?.length) {
				const { valid, message, relations } = await this.schema.validateRelations({
					schema: options.schema,
					relation_query: queryRelations,
					existing_relations: options.relations,
					x_request_id,
				})

				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				for (const relation of relations) {
					if (!postQueryRelations.find(r => r.table === relation.table)) {
						postQueryRelations.push(relation)
					}
				}
			}
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}

		options.where.push({
			column: primary_key,
			operator: WhereOperator.equals,
			value: id,
		})

		if (this.configService.get('database.deletes.soft')) {
			options.where.push({
				column: this.configService.get('database.deletes.soft'),
				operator: WhereOperator.null,
			})
		}

		try {
			let result = (await this.query.perform(
				QueryPerform.FIND_ONE,
				options,
				x_request_id,
			)) as FindOneResponseObject

			if (!result) {
				return res.status(204).send(this.response.text(`No record found for id ${id}`))
			}

			if (postQueryRelations?.length) {
				options.relations = postQueryRelations
				result = await this.query.buildRelations(options as DataSourceFindOneOptions, result, x_request_id)
			}

			return res.status(200).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}

	@Get('*/')
	async list(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@QueryParams() queryParams: FindManyQueryParams,
		@QueryParams('fields', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		queryFields?: string[],
		@QueryParams('relations', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		queryRelations?: string[],
		@QueryParams('sort', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		querySort?: string[],
	): Promise<FindManyResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		const options: DataSourceFindManyOptions = {
			schema: null,
			fields: [],
			where: [],
			relations: [],
			sort: [],
		}

		const postQueryRelations = []

		try {
			options.schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		try {
			//perform role check
			if (auth.user_identifier) {
				let permission = await this.roles.tablePermission({
					identifier: auth.user_identifier,
					table: table_name,
					access: RolePermission.READ,
					x_request_id,
				})

				if (!permission.valid) {
					return res
						.status(401)
						.send(this.response.text((permission as AuthTablePermissionFailResponse).message))
				}

				permission = permission as AuthTablePermissionSuccessResponse

				if (permission.valid && permission.restriction) {
					if (permission.restriction.column.includes('.')) {
						options.relations = options.relations.concat(
							await this.schema.convertDeepWhere({
								where: permission.restriction,
								schema: options.schema,
								x_request_id,
							}),
						)
					} else {
						options.where.push(permission.restriction)
					}
				}
			}

			const { limit, offset } = this.pagination.get(queryParams)
			options.limit = limit
			options.offset = offset

			if (queryFields?.length) {
				const { valid, message, fields, relations } = await this.schema.validateFields({
					schema: options.schema,
					fields: queryFields,
					x_request_id,
				})
				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				for (const field of fields) {
					if (!options.fields.includes(field)) {
						options.fields.push(field)
					}
				}

				for (const relation of relations) {
					if (!postQueryRelations.find(r => r.table === relation.table)) {
						postQueryRelations.push(relation)
					}
				}
			}

			if (queryRelations?.length) {
				const { valid, message, relations } = await this.schema.validateRelations({
					schema: options.schema,
					relation_query: queryRelations,
					existing_relations: options.relations,
					x_request_id,
				})
				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				if (relations) {
					for (const relation of relations) {
						if (!postQueryRelations.find(r => r.table === relation.table)) {
							postQueryRelations.push(relation)
						}
					}
				}
			}

			const validateWhere = await this.schema.validateWhereParams({ schema: options.schema, params: queryParams })
			if (!validateWhere.valid) {
				return res.status(400).send(this.response.text(validateWhere.message))
			}

			if (validateWhere.where.length) {
				options.where = options.where.concat(validateWhere.where)
			}

			let validateSort
			if (querySort?.length) {
				validateSort = this.schema.validateSort({ schema: options.schema, sort: querySort })
				if (!validateSort.valid) {
					return res.status(400).send(this.response.text(validateSort.message))
				}

				options.sort = validateSort.sort
			}
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}

		if (this.configService.get('database.deletes.soft')) {
			options.where.push({
				column: this.configService.get('database.deletes.soft'),
				operator: WhereOperator.null,
			})
		}

		try {
			let result = (await this.query.perform(
				QueryPerform.FIND_MANY,
				options,
				x_request_id,
			)) as FindManyResponseObject

			if (postQueryRelations?.length) {
				options.relations = postQueryRelations
				for (const i in result.data) {
					result.data[i] = await this.query.buildRelations(
						options as DataSourceFindOneOptions,
						result.data[i],
						x_request_id,
					)
				}
			}
			return res.status(200).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}
}
