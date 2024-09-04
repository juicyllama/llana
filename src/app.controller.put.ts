import { Controller, Put, Req, Res } from '@nestjs/common'

import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import { DatabaseSchema, DatabaseWhere, QueryPerform, WhereOperator } from './types/database.types'
import { FindOneResponseObject, IsUniqueResponse } from './types/response.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class PutController {
	constructor(
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly roles: Roles,
		private readonly schema: Schema,
	) {}

	@Put('*/:id')
	async updateById(@Req() req, @Res() res): Promise<FindOneResponseObject> {
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
			const permission = await this.roles.tablePermission(auth.user_identifier, table_name, RolePermission.WRITE)

			if (!permission.valid) {
				return res.status(401).send((permission as AuthTablePermissionFailResponse).message)
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
		}

		//validate input data
		const validate = await this.schema.validateData(schema, req.body)
		if (!validate.valid) {
			return res.status(400).send(validate.message)
		}

		//validate :id field
		const primary_key = this.schema.getPrimaryKey(schema)

		if (!primary_key) {
			return res.status(400).send(`No primary key found for table ${table_name}`)
		}

		const validateKey = await this.schema.validateData(schema, { [primary_key]: req.params.id })
		if (!validateKey.valid) {
			return res.status(400).send(validateKey.message)
		}

		//validate uniqueness
		const uniqueValidation = (await this.query.perform(QueryPerform.UNIQUE, {
			schema,
			data: req.body,
			id: req.params.id,
		})) as IsUniqueResponse
		if (!uniqueValidation.valid) {
			return res.status(400).send(uniqueValidation.message)
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

		//Check record exists

		const record = await this.query.perform(QueryPerform.FIND, {
			schema,
			where,
		})

		if (!record) {
			return res.status(400).send(`Record with id ${req.params.id} not found`)
		}

		try {
			return res.status(200).send(
				await this.query.perform(QueryPerform.UPDATE, {
					id: req.params.id,
					schema,
					data: validate.instance,
				}),
			)
		} catch (e) {
			return res.status(400).send(e.message)
		}
	}
}