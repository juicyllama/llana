import { Body, Controller, Post, Req, Res } from '@nestjs/common'

import { LoginService } from './app.service.login'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { AuthTablePermissionFailResponse } from './types/auth.types'
import { DatabaseCreateOneOptions, QueryPerform } from './types/database.types'
import { FindOneResponseObject, IsUniqueResponse } from './types/response.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class PostController {
	constructor(
		private readonly authentication: Authentication,
		private readonly loginService: LoginService,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly response: Response,
		private readonly roles: Roles,
	) {}

	@Post('/login')
	signIn(@Body() signInDto: Record<string, any>) {
		return this.loginService.signIn(signInDto.username, signInDto.password)
	}

	/**
	 * Create new record
	 */

	@Post('*/')
	async createOne(@Req() req, @Res() res): Promise<FindOneResponseObject> {
		const table_name = UrlToTable(req.originalUrl, 1)
		const body = req.body

		const options: DatabaseCreateOneOptions = {
			schema: null,
			data: {},
		}

		try {
			options.schema = await this.schema.getSchema(table_name)
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		const auth = await this.authentication.auth(req)
		if (!auth.valid) {
			return res.status(401).send(auth.message)
		}

		//perform role check
		if (auth.user_identifier) {
			const { valid, message } = (await this.roles.tablePermission(
				auth.user_identifier,
				table_name,
				RolePermission.WRITE,
			)) as AuthTablePermissionFailResponse

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
		const uniqueValidation = (await this.query.perform(QueryPerform.UNIQUE, options)) as IsUniqueResponse
		if (!uniqueValidation.valid) {
			return res.status(400).send(this.response.text(uniqueValidation.message))
		}

		try {
			const result = await this.query.perform(QueryPerform.CREATE, options)

			return res.status(201).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}
}
