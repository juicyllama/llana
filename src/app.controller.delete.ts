import { Body, Controller, Delete, Headers, Param, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { HeaderParams } from './dtos/requests.dto'
import { DeleteManyResponseObject, DeleteResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Websockets } from './helpers/Websockets'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import {
	DatabaseConfig,
	DatabaseSchema,
	DatabaseWhere,
	QueryPerform,
	SocketType,
	WhereOperator,
} from './types/database.types'
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
		private readonly websockets: Websockets,
	) {}

	@Delete('*/:id')
	async deleteById(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@Param('id') id: string,
	): Promise<DeleteResponseObject> {
		const x_request_id = headers['x-request-id']
		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.DELETE,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
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
			QueryPerform.FIND_ONE,
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
			const result = await this.query.perform(
				QueryPerform.DELETE,
				{
					id: id,
					schema,
					softDelete,
				},
				x_request_id,
			)
			await this.websockets.publish(schema, SocketType.DELETE, id)
			return res.status(200).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}

	@Delete('*/')
	async deleteMany(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@Body() body: Partial<any>[],
	): Promise<DeleteManyResponseObject> {
		const x_request_id = headers['x-request-id']
		const table_name = UrlToTable(req.originalUrl, 1)

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.DELETE,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
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

		if (body instanceof Array) {
			let total = body.length
			let deleted = 0
			let errored = 0
			const errors = []

			for (const item of body) {
				const id = item[primary_key]

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
					QueryPerform.FIND_ONE,
					{
						schema,
						where,
					},
					x_request_id,
				)

				if (!record) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: `Record with id ${id} not found`,
					})
					continue
				}

				//Soft or Hard delete check
				const databaseConfig: DatabaseConfig = this.configService.get('database')

				let softDelete: string = null

				if (
					databaseConfig.deletes.soft &&
					schema.columns.find(col => col.field === databaseConfig.deletes.soft)
				) {
					softDelete = databaseConfig.deletes.soft
				}

				try {
					await this.query.perform(
						QueryPerform.DELETE,
						{
							id: id,
							schema,
							softDelete,
						},
						x_request_id,
					)
					await this.websockets.publish(schema, SocketType.DELETE, id)
					deleted++
				} catch (e) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: e.message,
					})
				}
			}

			return res.status(200).send({
				total,
				deleted,
				errored,
				errors,
			} as DeleteManyResponseObject)
		} else {
			return res.status(400).send(this.response.text('Body must be an array'))
		}
	}
}
