import { Body, Controller, Delete, Headers, Param, Query as QueryParams, Req, Res, Header } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { LLANA_WEBHOOK_TABLE } from './app.constants'
import { HeaderParams } from './dtos/requests.dto'
import { DeleteManyResponseObject, DeleteResponseObject, FindOneResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { UrlToTable } from './helpers/Database'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Webhook } from './helpers/Webhook'
import { DataCacheService } from './modules/cache/dataCache.service'
import { WebsocketService } from './modules/websocket/websocket.service'
import { AuthTablePermissionFailResponse } from './types/auth.types'
import {
	DataSourceConfig,
	DataSourceSchema,
	DataSourceWhere,
	PublishType,
	QueryPerform,
	WhereOperator,
} from './types/datasource.types'
import { RolePermission } from './types/roles.types'

@Controller()
export class DeleteController {
	constructor(
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		private readonly dataCache: DataCacheService,
		private readonly query: Query,
		private readonly response: Response,
		private readonly roles: Roles,
		private readonly schema: Schema,
		private readonly websocket: WebsocketService,
		private readonly webhook: Webhook,
	) {}

	@Header('X-Robots-Tag', 'noindex, nofollow')
	@Delete('*/:id')
	async deleteById(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@Param('id') id: string,
		@QueryParams('hard') hard = false,
	): Promise<DeleteResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let schema: DataSourceSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		// Is the table public?
		let auth = await this.authentication.public({
			table: table_name,
			access_level: RolePermission.DELETE,
			x_request_id,
		})

		// If not public, perform auth
		if (!auth.valid) {
			auth = await this.authentication.auth({
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

		const where = <DataSourceWhere[]>[
			{
				column: primary_key,
				operator: WhereOperator.equals,
				value: id,
			},
		]

		//Check record exists

		const record = (await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema,
				where,
			},
			x_request_id,
		)) as FindOneResponseObject

		if (!record) {
			return res.status(400).send(this.response.text(`Record with id ${id} not found`))
		}

		//perform role check
		if (auth.user_identifier) {
			const permission = await this.roles.tablePermission({
				identifier: auth.user_identifier,
				table: table_name,
				access: RolePermission.DELETE,
				data: record,
				x_request_id,
			})

			if (!permission.valid) {
				return res.status(401).send(this.response.text((permission as AuthTablePermissionFailResponse).message))
			}
		}

		//Soft or Hard delete check
		const databaseConfig: DataSourceConfig = this.configService.get('database')

		let softDelete: string = null

		if (
			!hard &&
			databaseConfig.deletes.soft &&
			schema.columns.find(col => col.field === databaseConfig.deletes.soft)
		) {
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
			await this.websocket.publish(schema, PublishType.DELETE, id)
			await this.webhook.publish(schema, PublishType.DELETE, id, auth.user_identifier)
			await this.dataCache.ping(table_name)
			return res.status(200).send(result)
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}
	}

	@Header('X-Robots-Tag', 'noindex, nofollow')
	@Delete('*/')
	async deleteMany(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@Body() body: Partial<any> | Partial<any>[],
		@QueryParams('hard') hard = false,
	): Promise<DeleteManyResponseObject> {
		const x_request_id = headers['x-request-id']
		let table_name = UrlToTable(req.originalUrl, 1)

		if (table_name === 'webhook') {
			table_name = LLANA_WEBHOOK_TABLE
		}

		let schema: DataSourceSchema

		try {
			schema = await this.schema.getSchema({ table: table_name, x_request_id })
		} catch (e) {
			return res.status(404).send(this.response.text(e.message))
		}

		// Is the table public?
		let auth = await this.authentication.public({
			table: table_name,
			access_level: RolePermission.DELETE,
			x_request_id,
		})

		// If not public, perform auth
		if (!auth.valid) {
			auth = await this.authentication.auth({
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
				if (auth.user_identifier) {
					const permission = await this.roles.tablePermission({
						identifier: auth.user_identifier,
						table: table_name,
						access: RolePermission.DELETE,
						data: item,
						x_request_id,
					})

					if (!permission.valid) {
						errored++
						errors.push({
							item: body.indexOf(item),
							message: this.response.text((permission as AuthTablePermissionFailResponse).message),
						})
					}
				}

				const id = item[primary_key]

				const validateKey = await this.schema.validateData(schema, { [primary_key]: id })
				if (!validateKey.valid) {
					return res.status(400).send(this.response.text(validateKey.message))
				}

				const where = <DataSourceWhere[]>[
					{
						column: primary_key,
						operator: WhereOperator.equals,
						value: id,
					},
				]

				//Check record exists

				const record = (await this.query.perform(
					QueryPerform.FIND_ONE,
					{
						schema,
						where,
					},
					x_request_id,
				)) as FindOneResponseObject

				if (!record) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: `Record with id ${id} not found`,
					})
					continue
				}

				//Soft or Hard delete check
				const databaseConfig: DataSourceConfig = this.configService.get('database')

				let softDelete: string = null

				if (
					!hard &&
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
					await this.websocket.publish(schema, PublishType.DELETE, id)
					await this.webhook.publish(schema, PublishType.DELETE, id, auth.user_identifier)
					deleted++
				} catch (e) {
					errored++
					errors.push({
						item: body.indexOf(item),
						message: e.message,
					})
				}
			}

			await this.dataCache.ping(table_name)

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
