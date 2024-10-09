import { Controller, Headers, Post, Req, Res } from '@nestjs/common'

import { HeaderParams } from './dtos/requests.dto'
import { FindOneResponseObject, IsUniqueResponse } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Websockets } from './helpers/Websockets'
import { AuthTablePermissionFailResponse } from './types/auth.types'
import { DatabaseCreateOneOptions, QueryPerform, SocketType } from './types/database.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class PostController {
	constructor(
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly websockets: Websockets,
	) {}

	/**
	 * Create new record
	 */

	@Post('*/')
	async createOne(@Req() req, @Res() res, @Headers() headers: HeaderParams): Promise<FindOneResponseObject> {
		const x_request_id = headers['x-request-id']
		const table_name = UrlToTable(req.originalUrl, 1)
		const body = req.body

		const options: DatabaseCreateOneOptions = {
			schema: null,
			data: {},
		}

		try {
			options.schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth({ table: table_name, x_request_id, access: RolePermission.WRITE, headers: req.headers, body: req.body, query: req.query})
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

		//validate input data
		const { valid, message, instance } = await this.schema.validateData(options.schema, body)
		if (!valid) {
			return res.status(400).send(this.response.text(message))
		}

		options.data = instance

		//validate uniqueness
		const uniqueValidation = (await this.query.perform(
			QueryPerform.UNIQUE,
			options,
			x_request_id,
		)) as IsUniqueResponse
		if (!uniqueValidation.valid) {
			return res.status(400).send(this.response.text(uniqueValidation.message))
		}

		try {
			const result = await this.query.perform(QueryPerform.CREATE, options, x_request_id)
			await this.websockets.publish(options.schema, SocketType.INSERT, result[options.schema.primary_key])
			return res.status(201).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}
}
