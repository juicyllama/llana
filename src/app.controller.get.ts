import { Controller, Get, Req, Res } from '@nestjs/common'
import { FindService } from './app.service.find'
import { Logger } from './helpers/Logger'
import { UrlToTable } from './helpers/Database'
import { Schema } from './helpers/Schema'
import { GetResponseObject, ListResponseObject } from './types/response.types'
import { Authentication } from './helpers/Authentication'
import { Pagination } from './helpers/Pagination'
import { Sort } from './helpers/Sort'
import { Roles } from './helpers/Roles'
import { RolePermission } from './types/roles.types'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import { DatabaseSchema, DatabaseWhere, WhereOperator } from './types/database.types'

@Controller()
export class GetController {
	constructor(
		private readonly pagination: Pagination,
		private readonly service: FindService,
		private readonly logger: Logger,
		private readonly schema: Schema,
		private readonly sort: Sort,
		private readonly authentication: Authentication,
		private readonly roles: Roles,
	) {}

	@Get('')
	getDocs(@Res() res): string {
		this.logger.log('docs')
		return res.send(`
        <link rel="icon" href="/favicon.ico">
        <h1>Docs</h1>`)
	}

	@Get('/favicon.ico')
	fav(@Res() res): string {
		return res.sendFile('favicon.ico', { root: 'public' })
	}

	@Get('*/list')
	async list(@Req() req, @Res() res): Promise<ListResponseObject> {
		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send(e.message)
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(401).send(auth.message)
		}

		//perform role check

		const role_where = []

		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission(auth.user_identifier, table_name, RolePermission.READ)

			if (!permission.valid) {
				return res.status(401).send((permission as AuthTablePermissionFailResponse).message)
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
		}

		const { limit, offset } = this.pagination.get(req.query)

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		const relations = combineRelations(req.query.relations, validateFields?.relations)

		const validateWhere = this.schema.validateWhereParams(schema, req.query)
		if (!validateWhere.valid) {
			return res.status(400).send(validateWhere.message)
		}

		if (role_where.length > 0) {
			validateWhere.where = validateWhere.where.concat(role_where)
		}

		let validateRelations
		if (relations) {
			validateRelations = await this.schema.validateRelations(schema, relations)

			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}

			schema = validateRelations.schema

			for (const relation of relations) {
				let relation_schema

				try {
					relation_schema = await this.schema.getSchema(relation)
				} catch (e) {
					return res.status(400).send(e.message)
				}

				const relation_fields = req.query.fields?.split(',')?.filter(field => field.includes(relation))
				const relation_fields_no_prefix = relation_fields.map(field => field.replace(`${relation}.`, ''))

				if (relation_fields_no_prefix.length > 0) {
					const validateRelationFields = this.schema.validateFields(
						relation_schema,
						relation_fields_no_prefix.join(','),
					)
					if (!validateRelationFields.valid) {
						return res.status(400).send(validateRelationFields.message)
					}
				}

				const relationship_where_fields = Object.keys(req.query)
					.filter(key => key.includes(`${relation}.`))
					.map(key => key.replace(`${relation}.`, ''))
					.reduce((obj, key) => {
						obj[key] = req.query[`${relation}.${key}`]
						return obj
					}, {})

				if (relationship_where_fields) {
					const relationshipValidateWhere = this.schema.validateWhereParams(
						relation_schema,
						relationship_where_fields,
					)
					if (!relationshipValidateWhere.valid) {
						return res.status(400).send(relationshipValidateWhere.message)
					}

					for (const r in relationshipValidateWhere.where) {
						relationshipValidateWhere.where[r].column =
							`${relation}.${relationshipValidateWhere.where[r].column}`
					}

					validateWhere.where = validateWhere.where.concat(relationshipValidateWhere.where)
				}

				const relationship_sort_fields = req.query.sort?.split(',')?.filter(key => key.includes(`${relation}.`))
				if (relationship_sort_fields?.length > 0) {
					const validateOrder = this.schema.validateOrder(
						relation_schema,
						relationship_sort_fields.join(', '),
					)
					if (!validateOrder.valid) {
						return res.status(400).send(validateOrder.message)
					}
				}
			}
		}

		let validateOrder
		if (req.query.sort) {
			validateOrder = this.schema.validateOrder(schema, req.query.sort)
			if (!validateOrder.valid) {
				return res.status(400).send(validateOrder.message)
			}
		}

		return res.status(200).send(
			await this.service.findMany({
				schema,
				fields: validateFields?.params ?? [],
				relations,
				where: validateWhere.where,
				limit,
				offset,
				sort: this.sort.createSortArray(req.query.sort),
				joins: !!(req.query.join === 'DATABASE'),
			}),
		)
	}

	@Get('*/:id')
	async getById(@Req() req, @Res() res): Promise<GetResponseObject> {
		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send(e.message)
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(401).send(auth.message)
		}

		//perform role check

		const role_where = []

		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission(auth.user_identifier, table_name, RolePermission.READ)

			if (!permission.valid) {
				return res.status(401).send((permission as AuthTablePermissionFailResponse).message)
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
		}

		//validate :id field
		const primary_key = this.schema.getPrimaryKey(schema)

		if (!primary_key) {
			return res.status(400).send(`No primary key found for table ${table_name}`)
		}

		const validateKey = this.schema.validateColumnData(schema, primary_key, req.params.id)
		if (!validateKey.valid) {
			return res.status(400).send(validateKey.message)
		}

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		const relations = combineRelations(req.query.relations, validateFields?.relations)

		let validateRelations
		if (relations) {
			validateRelations = await this.schema.validateRelations(schema, relations)
			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}

			schema = validateRelations.schema
		}

		const where = <DatabaseWhere[]>[
			{
				column: primary_key,
				operator: WhereOperator.equals,
				value: req.params.id,
			},
		]

		if (role_where.length > 0) {
			where.concat(role_where)
		}

		return res.status(200).send(
			await this.service.findOne({
				schema,
				fields: validateFields?.params ?? [],
				relations,
				where,
			}),
		)
	}

	@Get('*/')
	async getOne(@Req() req, @Res() res): Promise<ListResponseObject> {
		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send(e.message)
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(401).send(auth.message)
		}

		//perform role check

		const role_where = []

		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission(auth.user_identifier, table_name, RolePermission.READ)

			if (!permission.valid) {
				return res.status(401).send((permission as AuthTablePermissionFailResponse).message)
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
		}

		let validateFields
		if (req.query.fields) {
			validateFields = this.schema.validateFields(schema, req.query.fields)
			if (!validateFields.valid) {
				return res.status(400).send(validateFields.message)
			}
		}

		const relations = combineRelations(req.query.relations, validateFields?.relations)

		const validateWhere = this.schema.validateWhereParams(schema, req.query)
		if (!validateWhere.valid) {
			return res.status(400).send(validateWhere.message)
		}

		if (role_where.length > 0) {
			validateWhere.where = validateWhere.where.concat(role_where)
		}

		let validateRelations
		if (relations) {
			validateRelations = await this.schema.validateRelations(schema, relations)
			if (!validateRelations.valid) {
				return res.status(400).send(validateRelations.message)
			}

			schema = validateRelations.schema

			for (const relation of relations) {
				let relation_schema

				try {
					relation_schema = await this.schema.getSchema(relation)
				} catch (e) {
					return res.status(400).send(e.message)
				}

				const relation_fields = req.query.fields?.split(',')?.filter(field => field.includes(relation))
				const relation_fields_no_prefix = relation_fields.map(field => field.replace(`${relation}.`, ''))

				if (relation_fields_no_prefix.length > 0) {
					const validateRelationFields = this.schema.validateFields(
						relation_schema,
						relation_fields_no_prefix.join(','),
					)
					if (!validateRelationFields.valid) {
						return res.status(400).send(validateRelationFields.message)
					}
				}

				const relationship_where_fields = Object.keys(req.query)
					.filter(key => key.includes(`${relation}.`))
					.map(key => key.replace(`${relation}.`, ''))
					.reduce((obj, key) => {
						obj[key] = req.query[`${relation}.${key}`]
						return obj
					}, {})

				if (relationship_where_fields) {
					const relationshipValidateWhere = this.schema.validateWhereParams(
						relation_schema,
						relationship_where_fields,
					)
					if (!relationshipValidateWhere.valid) {
						return res.status(400).send(relationshipValidateWhere.message)
					}

					for (const r in relationshipValidateWhere.where) {
						relationshipValidateWhere.where[r].column =
							`${relation}.${relationshipValidateWhere.where[r].column}`
					}

					validateWhere.where = validateWhere.where.concat(relationshipValidateWhere.where)
				}
			}
		}

		return res.status(200).send(
			await this.service.findOne({
				schema,
				fields: validateFields?.params ?? [],
				relations,
				where: validateWhere.where,
			}),
		)
	}
}

function combineRelations(query: string, validatedFieldRelations: string[]): string[] {
	const relations = query ? query.split(',') : []

	if (validatedFieldRelations) {
		validatedFieldRelations.forEach(relation => {
			if (!relations.includes(relation)) {
				relations.push(relation)
			}
		})
	}

	return relations
}
