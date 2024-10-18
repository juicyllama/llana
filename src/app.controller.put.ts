import { Body, Controller, Headers, Param, Put, Req, Res } from '@nestjs/common'

import { HeaderParams } from './dtos/requests.dto'
import { FindOneResponseObject, IsUniqueResponse, UpdateManyResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Websocket } from './helpers/Websocket'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import { DatabaseSchema, DatabaseWhere, QueryPerform, PublishType, WhereOperator } from './types/database.types'
import { RolePermission } from './types/roles.types'
import { Webhook } from './helpers/Webhook'
import { LLANA_WEBHOOK_TABLE } from './app.constants'

@Controller()
export class PutController {
	constructor(
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly schema: Schema,
		private readonly websocket: Websocket,
		private readonly webhooks: Webhook,
	) {}

	@Put('*/:id')
	async updateById(
		@Req() req,
		@Res() res,
		@Body() body: Partial<any>,
		@Headers() headers: HeaderParams,
		@Param('id') id: string,
	): Promise<FindOneResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if(table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.WRITE,
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
				access: RolePermission.WRITE,
				x_request_id,
			})

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
		const uniqueValidation = (await this.query.perform(
			QueryPerform.UNIQUE,
			{
				schema,
				data: body,
				id: id,
			},
			x_request_id,
		)) as IsUniqueResponse
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

		const record = await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema,
				where,
			},
			x_request_id,
		) as FindOneResponseObject

		if (!record) {
			return res.status(400).send(this.response.text(`Record with id ${id} not found`))
		}

		try {

			if(table_name === LLANA_WEBHOOK_TABLE) {
			
				//perform auth on webhook table
				const auth = await this.authentication.auth({
					table:record.table,
					x_request_id,
					access: RolePermission.READ,
					headers: req.headers,
					body: req.body,
					query: req.query,
				})
				if (!auth.valid) {
					return res.status(401).send(auth.message)
				}
		
				//perform role check
				if (auth.user_identifier) {
					const { valid, message } = (await this.roles.tablePermission({
						identifier: auth.user_identifier,
						table:record.table,
						access: RolePermission.READ,
						x_request_id,
					})) as AuthTablePermissionFailResponse
		
					if (!valid) {
						return res.status(401).send(this.response.text(message))
					}
				}
				const result = await this.query.perform(
					QueryPerform.UPDATE,
					{ id, schema, data: validate.instance },
					x_request_id,
				)
				return res.status(200).send(result)

			}

			const result = await this.query.perform(
				QueryPerform.UPDATE,
				{ id, schema, data: validate.instance },
				x_request_id,
			)
			await this.websocket.publish(schema, PublishType.UPDATE, result[schema.primary_key])
			await this.webhooks.publish(schema, PublishType.UPDATE, result[schema.primary_key], auth.user_identifier)
			return res.status(200).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}

	@Put('*/')
	async updateMany(
		@Req() req,
		@Res() res,
		@Body() body: Partial<any>[],
		@Headers() headers: HeaderParams,
	): Promise<UpdateManyResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if(table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let schema: DatabaseSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.WRITE,
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
				access: RolePermission.WRITE,
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
			const total = body.length
			let successful = 0
			let errored = 0
			const errors = []
			const data: FindOneResponseObject[] = []

			for (const item of body) {
				//validate input data
				const validate = await this.schema.validateData(schema, item)
				if (!validate.valid) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: validate.message,
					})
					continue
				}

				const validateKey = await this.schema.validateData(schema, { [primary_key]: item[primary_key] })
				if (!validateKey.valid) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: validateKey.message,
					})
					continue
				}

				//validate uniqueness
				const uniqueValidation = (await this.query.perform(
					QueryPerform.UNIQUE,
					{
						schema,
						data: item,
						id: item[primary_key],
					},
					x_request_id,
				)) as IsUniqueResponse

				if (!uniqueValidation.valid) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: uniqueValidation.message,
					})
					continue
				}

				const where = <DatabaseWhere[]>[
					{
						column: primary_key,
						operator: WhereOperator.equals,
						value: item[primary_key],
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
				) as FindOneResponseObject

				if (!record) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: `Record with id ${item[primary_key]} not found`,
					})
					continue
				}

				try {

					if(table_name === LLANA_WEBHOOK_TABLE) {
			
						//perform auth on webhook table
						const auth = await this.authentication.auth({
							table:record.table,
							x_request_id,
							access: RolePermission.READ,
							headers: req.headers,
							body: req.body,
							query: req.query,
						})
						if (!auth.valid) {
							return res.status(401).send(auth.message)
						}
				
						//perform role check
						if (auth.user_identifier) {
							const { valid, message } = (await this.roles.tablePermission({
								identifier: auth.user_identifier,
								table:record.table,
								access: RolePermission.READ,
								x_request_id,
							})) as AuthTablePermissionFailResponse
				
							if (!valid) {
								return res.status(401).send(this.response.text(message))
							}
						}
					}

					const result = (await this.query.perform(
						QueryPerform.UPDATE,
						{ id: item[primary_key], schema, data: validate.instance },
						x_request_id,
					)) as FindOneResponseObject
					await this.websocket.publish(schema, PublishType.UPDATE, result[schema.primary_key])
					await this.webhooks.publish(schema, PublishType.UPDATE, result[schema.primary_key], auth.user_identifier)
					successful++
					data.push(result)
				} catch (e) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: e.message,
					})
					continue
				}
			}

			return res.status(200).send({
				total,
				successful,
				errored,
				errors,
				data,
			} as UpdateManyResponseObject)
		}

		return res.status(400).send(this.response.text('Body must be an array'))
	}
}
