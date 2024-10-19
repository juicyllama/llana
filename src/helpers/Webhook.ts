import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { Cache } from 'cache-manager'

import { CACHE_DEFAULT_WEBHOOK_TTL, LLANA_WEBHOOK_LOG_TABLE, LLANA_WEBHOOK_TABLE } from '../app.constants'
import { FindManyResponseObject, FindOneResponseObject } from '../dtos/response.dto'
import { WebhookLog } from '../dtos/webhook.dto'
import { Webhook as WebhookType } from '../dtos/webhook.dto'
import { DatabaseSchema, PublishType, QueryPerform, WhereOperator } from '../types/database.types'
import { RolePermission } from '../types/roles.types'
import { Authentication } from './Authentication'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Webhook {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async publish(
		schema: DatabaseSchema,
		type: PublishType,
		id: string | number,
		user_identifier?: string | number,
	): Promise<void> {
		this.logger.debug(`[Webhook] Publishing ${schema.table} ${type} for #${id}`)

		const webhookSchema = await this.schema.getSchema({ table: LLANA_WEBHOOK_TABLE })
		const webhookLogSchema = await this.schema.getSchema({ table: LLANA_WEBHOOK_LOG_TABLE })

		const webhooksWhere = [
			{
				column: 'table',
				operator: WhereOperator.equals,
				value: schema.table,
			},
		]

		let webhooks = <FindManyResponseObject>await this.cacheManager.get(`webhooks:all:${schema.table}`)

		if (!webhooks) {
			webhooks = (await this.query.perform(QueryPerform.FIND_MANY, {
				schema: webhookSchema,
				where: [
					...webhooksWhere,
					{
						column: 'user_identifier',
						operator: WhereOperator.null,
					},
				],
			})) as FindManyResponseObject

			await this.cacheManager.set(
				`webhooks:all:${schema.table}`,
				webhooks,
				this.configService.get('CACHE_WEBHOOKS_TTL') ?? CACHE_DEFAULT_WEBHOOK_TTL,
			)
		}

		if (user_identifier) {
			let webhooksUser = <FindManyResponseObject>(
				await this.cacheManager.get(`webhooks:${schema.table}:${user_identifier}`)
			)

			if (!webhooksUser) {
				webhooksUser = (await this.query.perform(QueryPerform.FIND_MANY, {
					schema: webhookSchema,
					where: [
						...webhooksWhere,
						{
							column: 'user_identifier',
							operator: WhereOperator.equals,
							value: user_identifier.toString(),
						},
					],
				})) as FindManyResponseObject

				await this.cacheManager.set(
					`webhooks:${schema.table}:${user_identifier}`,
					webhooksUser,
					this.configService.get('CACHE_WEBHOOKS_TTL') ?? CACHE_DEFAULT_WEBHOOK_TTL,
				)

				webhooks.data = webhooks.data.concat(webhooksUser.data)
			}
		}

		for (const webhook of webhooks.data) {
			if (user_identifier) {
				const auth = await this.authentication.auth({
					table: schema.table,
					access: RolePermission.READ,
					user_identifier: user_identifier.toString(),
				})

				if (!auth.valid) {
					continue
				}
			}

			await this.query.perform(QueryPerform.CREATE, {
				schema: webhookLogSchema,
				data: <WebhookLog>{
					webhook_id: webhook.id,
					type,
					url: webhook.url,
					record_key: schema.primary_key,
					record_id: id,
					delivered: false,
				},
			})
		}
	}

	async getPendingWebhooks(): Promise<WebhookLog[]> {
		const webhookLogSchema = await this.schema.getSchema({ table: LLANA_WEBHOOK_LOG_TABLE })
		const webhooks = (await this.query.perform(QueryPerform.FIND_MANY, {
			schema: webhookLogSchema,
			where: [
				{
					column: 'delivered',
					operator: WhereOperator.equals,
					value: false,
				},
				{
					column: 'next_attempt_at',
					operator: WhereOperator.lt,
					value: new Date(),
				},
			],
			limit: 999,
		})) as FindManyResponseObject

		return webhooks.data as WebhookLog[]
	}

	async sendWebhook(webhook: WebhookLog): Promise<void> {
		const webhookLogSchema = await this.schema.getSchema({ table: LLANA_WEBHOOK_LOG_TABLE })

		try {
			const response = await axios({
				method: webhook.type,
				url: webhook.url,
				data: {
					webhook_id: webhook.id,
					type: webhook.type,
					[webhook.record_key]: webhook.record_id,
				},
			})

			await this.query.perform(QueryPerform.UPDATE, {
				id: webhook.id.toString(),
				schema: webhookLogSchema,
				data: <Partial<WebhookLog>>{
					response_status: response.status,
					response_message: response.statusText,
					delivered: true,
					delivered_at: new Date(),
					next_attempt_at: null,
				},
			})

			this.logger.debug(`[Webhook] Sending ${webhook.type} to ${webhook.url}`)
		} catch (e: any) {
			this.logger.warn(`[Webhook] Error sending ${webhook.type} to ${webhook.url} - ${e.message}`)

			let next_attempt_at = new Date(Date.now() + webhook.attempt * webhook.attempt * webhook.attempt * 60000)

			if (webhook.attempt >= 5) {
				next_attempt_at = null
			}

			await this.query.perform(QueryPerform.UPDATE, {
				id: webhook.id.toString(),
				schema: webhookLogSchema,
				data: <Partial<WebhookLog>>{
					attempt: webhook.attempt + 1,
					next_attempt_at: next_attempt_at,
					response_status: e.response.status ?? 500,
					response_message: e.response.message ?? e.message,
				},
			})
		}
	}

	async addWebhook(data: Partial<WebhookType>): Promise<FindOneResponseObject> {
		const schema = await this.schema.getSchema({ table: LLANA_WEBHOOK_TABLE })
		const result = (await this.query.perform(QueryPerform.CREATE, {
			schema,
			data,
		})) as FindOneResponseObject
		await this.cacheManager.del(`webhooks:${data.table}:*`)
		return result
	}

	async editWebhook(id: string, data: Partial<WebhookType>): Promise<FindOneResponseObject> {
		const schema = await this.schema.getSchema({ table: LLANA_WEBHOOK_TABLE })
		const result = (await this.query.perform(QueryPerform.UPDATE, {
			schema,
			where: [
				{
					column: 'id',
					operator: WhereOperator.equals,
					value: id,
				},
			],
			data,
		})) as FindOneResponseObject
		await this.cacheManager.del(`webhooks:${data.table}:*`)
		return result
	}

	async deleteWebhook(id: string): Promise<void> {
		const schema = await this.schema.getSchema({ table: LLANA_WEBHOOK_TABLE })
		const webhook = (await this.query.perform(QueryPerform.FIND_ONE, {
			schema,
			where: [
				{
					column: 'id',
					operator: WhereOperator.equals,
					value: id,
				},
			],
		})) as FindOneResponseObject

		if (!webhook) {
			return
		}

		await this.query.perform(QueryPerform.DELETE, {
			schema,
			where: [
				{
					column: 'id',
					operator: WhereOperator.equals,
					value: id,
				},
			],
		})

		await this.cacheManager.del(`webhooks:${webhook.table}:*`)
	}
}
