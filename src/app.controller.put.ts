import { Controller, Put, Req, Res } from '@nestjs/common'

import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Request } from './helpers/Request'
import { Response } from './helpers/Response'
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
		private readonly request: Request,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly schema: Schema,
	) {}

	@Put('*/:id')
	async updateById(@Req() req, @Res() res): Promise<FindOneResponseObject> {
		const table_name = UrlToTable(req.originalUrl, 1)
		const id = this.request.escapeText(req.params.id)
		const body = this.request.escapeObject(req.body)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		//perform role check

		const role_where = []

		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission(auth.user_identifier, table_name, RolePermission.WRITE)

			if (!permission.valid) {
				return res.status(401).send(this.response.text((permission as AuthTablePermissionFailResponse).message))
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
		}

		//validate input data
		const validate = await this.schema.validateData(schema, body)
		if (!validate.valid) {
			return res.status(400).send(this.response.text(validate.message))
		}

		//validate :id field
		const primary_key = this.schema.getPrimaryKey(schema)

		if (!primary_key) {
			return res.status(400).send(this.response.text(`No primary key found for table ${table_name}`))
		}

		const validateKey = await this.schema.validateData(schema, { [primary_key]: id })
		if (!validateKey.valid) {
			return res.status(400).send(this.response.text(validateKey.message))
		}

		//validate uniqueness
		const uniqueValidation = (await this.query.perform(QueryPerform.UNIQUE, {
			schema,
			data: body,
			id: id,
		})) as IsUniqueResponse
		if (!uniqueValidation.valid) {
			return res.status(400).send(this.response.text(uniqueValidation.message))
		}

		const where = <DatabaseWhere[]>[
			{
				column: primary_key,
				operator: WhereOperator.equals,
				value: id,
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
			return res.status(400).send(this.response.text(`Record with id ${id} not found`))
		}

		try {
			return res.status(200).send(
				await this.query.perform(QueryPerform.UPDATE, {
					id: id,
					schema,
					data: validate.instance,
				}),
			)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}
}
