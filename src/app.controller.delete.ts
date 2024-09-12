import { Controller, Delete, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import { DatabaseConfig, DatabaseSchema, DatabaseWhere, QueryPerform, WhereOperator } from './types/database.types'
import { DeleteResponseObject } from './types/response.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class DeleteController {
	constructor(
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		private readonly query: Query,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly schema: Schema,
	) {}

	@Delete('*/:id')
	async deleteById(@Req() req, @Res() res): Promise<DeleteResponseObject> {
		const x_request_id = req.headers['x-request-id'] as string
		const table_name = UrlToTable(req.originalUrl, 1)
		const id = req.params.id

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({ req, x_request_id })
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		//perform role check

		const role_where = []

		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission({
				identifier: auth.user_identifier,
				table: table_name,
				access: RolePermission.DELETE,
				x_request_id,
			})

			if (!permission.valid) {
				return res.status(401).send(this.response.text((permission as AuthTablePermissionFailResponse).message))
			}

			if (permission.valid && (permission as AuthTablePermissionSuccessResponse).restriction) {
				role_where.push((permission as AuthTablePermissionSuccessResponse).restriction)
			}
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

		const record = await this.query.perform(
			QueryPerform.FIND,
			{
				schema,
				where,
			},
			x_request_id,
		)

		if (!record) {
			return res.status(400).send(this.response.text(`Record with id ${id} not found`))
		}

		//Soft or Hard delete check
		const databaseConfig: DatabaseConfig = this.configService.get('database')

		let softDelete: string = null

		if (databaseConfig.deletes.soft && schema.columns.find(col => col.field === databaseConfig.deletes.soft)) {
			softDelete = databaseConfig.deletes.soft
		}

		try {
			return res.status(200).send(
				await this.query.perform(
					QueryPerform.DELETE,
					{
						id: id,
						schema,
						softDelete,
					},
					x_request_id,
				),
			)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}
}
