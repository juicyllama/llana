import { Body, Controller, Headers, Post, Req, Res } from '@nestjs/common'

import { LLANA_WEBHOOK_TABLE } from './app.constants'
import { HeaderParams } from './dtos/requests.dto'
import { CreateManyResponseObject, FindOneResponseObject, IsUniqueResponse } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { DataCacheService } from './modules/cache/dataCache.service'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Webhook } from './helpers/Webhook'
import { WebsocketService } from './modules/websocket/websocket.service'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from './types/auth.types'
import { DataSourceCreateOneOptions, DataSourceSchema, PublishType, QueryPerform } from './types/datasource.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class PostController {
	constructor(
		private readonly authentication: Authentication,
		private readonly dataCache: DataCacheService,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly websocket: WebsocketService,
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
		@Body() body: Partial<any> | Partial<any>[],
	): Promise<FindOneResponseObject | CreateManyResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let schema: DataSourceSchema
		let queryFields = []

		// Is the table public?
		const public_auth = await this.authentication.public({
			table: table_name,
			access_level: RolePermission.WRITE,
			x_request_id,
		})

		if (public_auth.valid && public_auth.allowed_fields?.length) {
			if (!queryFields?.length) {
				queryFields = public_auth.allowed_fields
			} else {
				queryFields = queryFields.filter(field => public_auth.allowed_fields.includes(field))
			}
		}

		// If not public, perform auth

		const auth = await this.authentication.auth({
			table: table_name,
			x_request_id,
			access: RolePermission.WRITE,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})

		if (!public_auth.valid && !auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		let singular = false

		if (!(body instanceof Array)) {
			body = [body]
			singular = true
		}

		const total = body.length
		let successful = 0
		let errored = 0
		const errors = []
		const data: FindOneResponseObject[] = []

		for (const item of body as Partial<any>[]) {
			//perform role check
			if (auth.user_identifier) {
				const permission = await this.roles.tablePermission({
					identifier: auth.user_identifier,
					table: table_name,
					access: RolePermission.WRITE,
					data: item,
					x_request_id,
				})

				if (!public_auth.valid && !permission.valid) {
					if (singular) {
						return res
							.status(401)
							.send(this.response.text((permission as AuthTablePermissionFailResponse).message))
					}

					errored++
					errors.push({
						item: body.indexOf(item),
						message: this.response.text((permission as AuthTablePermissionFailResponse).message),
					})
					continue
				}

				if (permission.valid && (permission as AuthTablePermissionSuccessResponse).allowed_fields?.length) {
					if (!queryFields?.length) {
						queryFields = (permission as AuthTablePermissionSuccessResponse).allowed_fields
					} else {
						queryFields.push(...(permission as AuthTablePermissionSuccessResponse).allowed_fields)
						queryFields = queryFields.filter(field =>
							(permission as AuthTablePermissionSuccessResponse).allowed_fields.includes(field),
						)
					}
				}
			}

			try {
				schema = await this.schema.getSchema({ table: table_name, x_request_id })
			} catch (e) {
				return res.status(404).send(this.response.text(e.message))
			}

			const insertResult = await this.createOneRecord(
				{
					schema,
					data: item,
				},
				auth.user_identifier,
				queryFields,
				x_request_id,
			)

			if (!insertResult.valid) {
				errored++
				errors.push({
					item: Array.isArray(body) ? body.findIndex(i => i === item) : -1,
					message: insertResult.message,
				})
				continue
			}

			data.push(insertResult.result)
			await this.websocket.publish(schema, PublishType.INSERT, insertResult.result[schema.primary_key])
			await this.webhook.publish(
				schema,
				PublishType.INSERT,
				insertResult.result[schema.primary_key],
				auth.user_identifier,
			)
			successful++
		}

		await this.dataCache.ping(table_name)

		if (singular) {
			if (errors.length) {
				return res.status(400).send(errors[0].message)
			}

			return res.status(201).send(data[0]) as FindOneResponseObject
		}

		return res.status(201).send({
			total,
			successful,
			errored,
			errors,
			data,
		} as CreateManyResponseObject)
	}

	/**
	 * Create the record
	 */

	private async createOneRecord(
		options: DataSourceCreateOneOptions,
		user_identifier,
		fields: string[],
		x_request_id,
	): Promise<{
		valid: boolean
		message?: string
		result?: FindOneResponseObject
	}> {
		//validate input data
		const { valid, message, instance } = await this.schema.validateData(options.schema, options.data)
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

			//Filter results
			if (fields.length) {
				const filtered = {}
				for (const field of fields) {
					filtered[field] = result[field]
				}
				return {
					valid: true,
					result: filtered,
				}
			}

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
