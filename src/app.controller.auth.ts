import { BadRequestException, Body, Controller, Get, Headers, Post, Req, Res, Query as QueryParams, ParseArrayPipe } from '@nestjs/common'

import { AuthService } from './app.service.auth'
import { HeaderParams } from './dtos/requests.dto'
import { Authentication } from './helpers/Authentication'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Schema } from './helpers/Schema'
import { DataSourceFindOneOptions, QueryPerform, WhereOperator } from './types/datasource.types'
import { RolePermission } from './types/roles.types'
import { FindOneResponseObject } from './dtos/response.dto'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly response: Response,
		private readonly schema: Schema,
	) {}

	/**
	 * Exchange a username and password for an access token
	 */

	@Post('/login')
	async login(
		@Res() res,
		@Body() signInDto: Record<string, any>,
		@Headers() headers: HeaderParams,
	): Promise<{ access_token: string; id: any }> {
		if (this.authentication.skipAuth()) {
			throw new BadRequestException('Authentication is disabled')
		}

		const x_request_id = headers['x-request-id']
		return res.status(200).send(await this.authService.signIn(signInDto.username, signInDto.password, x_request_id))
	}

	/*
	 * Return the current user's profile, useful for testing the access token
	 */

	@Get('/profile')
	async profile(
		@Req() req, 
		@Res() res, 
		@Headers() headers: HeaderParams,
		@QueryParams('relations', new ParseArrayPipe({ items: String, separator: ',', optional: true })) queryRelations?: string[],
	): Promise<any> {
		if (this.authentication.skipAuth()) {
			throw new BadRequestException('Authentication is disabled')
		}

		const x_request_id = headers['x-request-id']
		const table = this.authentication.getIdentityTable()
		const auth = await this.authentication.auth({
			table,
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		//return the user's profile
		const schema = await this.schema.getSchema({ table, x_request_id })
		const identity_column = await this.authentication.getIdentityColumn(x_request_id)

		const postQueryRelations = []

		try{
			if (queryRelations?.length) {
				const { valid, message, relations } = await this.schema.validateRelations({
					schema,
					relation_query: queryRelations,
					existing_relations: [],
					x_request_id,
				})

				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				for (const relation of relations) {
					if (!postQueryRelations.find(r => r.table === relation.table)) {
						postQueryRelations.push(relation)
					}
				}
			}
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}

		const databaseQuery: DataSourceFindOneOptions = {
			schema,
			where: [
				{
					column: identity_column,
					operator: WhereOperator.equals,
					value: auth.user_identifier,
				},
			],
			relations: postQueryRelations,
		}

		let user = await this.query.perform(QueryPerform.FIND_ONE, databaseQuery, x_request_id) as FindOneResponseObject
		
		if (postQueryRelations?.length) {
			user = await this.query.buildRelations({
				schema,
				relations: postQueryRelations,
			}as DataSourceFindOneOptions, user, x_request_id)
		}

		
		return res.status(200).send(user)
	}
}
