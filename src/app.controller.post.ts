import { Controller, Headers, Post, Req, Res } from '@nestjs/common'

import { LLANA_WEBHOOK_TABLE } from './app.constants'
import { HeaderParams } from './dtos/requests.dto'
import { CreateManyResponseObject, FindOneResponseObject, IsUniqueResponse } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Webhook } from './helpers/Webhook'
import { Websocket } from './helpers/Websocket'
import { AuthTablePermissionFailResponse } from './types/auth.types'
import { DataSourceCreateOneOptions, PublishType, QueryPerform } from './types/datasource.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class PostController {
	constructor(
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly websocket: Websocket,
		private readonly webhook: Webhook,
	) {}

	/**
	 * Create new record
	 */

	@Post('*/')
	async create(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
	): Promise<FindOneResponseObject | CreateManyResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE

			//perform auth on webhook table
			const auth = await this.authentication.auth({
				table: req.body.table,
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
					table: req.body.table,
					access: RolePermission.READ,
					x_request_id,
				})) as AuthTablePermissionFailResponse

				if (!valid) {
					return res.status(401).send(this.response.text(message))
				}
			}

			if (!req.body.user_identifier) {
				req.body.user_identifier = auth.user_identifier
			}
		}

		const body = req.body

		const options: DataSourceCreateOneOptions = {
			schema: null,
			data: {},
		}

		try {
			options.schema = await this.schema.getSchema({ table: table_name, x_request_id })
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
			return res.status(401).send(auth.message)
		}

		//perform role check
		if (auth.user_identifier) {
			const { valid, message } = (await this.roles.tablePermission({
				identifier: auth.user_identifier,
				table: table_name,
				access: RolePermission.WRITE,
				x_request_id,
			})) as AuthTablePermissionFailResponse

			if (!valid) {
				return res.status(401).send(this.response.text(message))
			}
		}

		if (body instanceof Array) {
			const total = body.length
			let successful = 0
			let errored = 0
			const errors = []
			const data: FindOneResponseObject[] = []

			for (const item of body) {
				const insertResult = await this.createOneRecord(options, item, auth.user_identifier, x_request_id)

				if (!insertResult.valid) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: insertResult.message,
					})
					continue
				}

				data.push(insertResult.result)
				await this.websocket.publish(
					options.schema,
					PublishType.INSERT,
					insertResult.result[options.schema.primary_key],
				)
				await this.webhook.publish(
					options.schema,
					PublishType.INSERT,
					insertResult.result[options.schema.primary_key],
					auth.user_identifier,
				)
				successful++
			}

			return res.status(201).send({
				total,
				successful,
				errored,
				errors,
				data,
			} as CreateManyResponseObject)
		}

		const insertResult = await this.createOneRecord(options, body, auth.user_identifier, x_request_id)

		if (!insertResult.valid) {
			return res.status(400).send(this.response.text(insertResult.message))
		}
		return res.status(201).send(insertResult.result)
	}

	/**
	 * Create the record
	 */

	async createOneRecord(
		options,
		data,
		user_identifier,
		x_request_id,
	): Promise<{
		valid: boolean
		message?: string
		result?: FindOneResponseObject
	}> {
		//validate input data
		const { valid, message, instance } = await this.schema.validateData(options.schema, data)
		if (!valid) {
			return {
				valid,
				message,
			}
		}

		options.data = instance

		//validate uniqueness
		const uniqueValidation = (await this.query.perform(
			QueryPerform.UNIQUE,
			options,
			x_request_id,
		)) as IsUniqueResponse

		if (!uniqueValidation.valid) {
			return {
				valid: false,
				message: uniqueValidation.message,
			}
		}

		try {
			const result = (await this.query.perform(
				QueryPerform.CREATE,
				options,
				x_request_id,
			)) as FindOneResponseObject

			await this.websocket.publish(options.schema, PublishType.INSERT, result[options.schema.primary_key])
			await this.webhook.publish(
				options.schema,
				PublishType.INSERT,
				result[options.schema.primary_key],
				user_identifier,
			)
			return {
				valid: true,
				result,
			}
		} catch (e) {
			return {
				valid: false,
				message: e.message,
			}
		}
	}
}
