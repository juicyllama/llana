import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common'
import Redis from 'ioredis'
import { DataSourceSchema, PublishType } from 'src/types/datasource.types'

import { Logger } from '../../helpers/Logger'
import { REDIS_PUB_CLIENT_TOKEN, WebsocketRedisEvent, WEBSOCKETS_REDIS_CHANNEL } from './websocket.constants'

@Injectable()
export class WebsocketService implements OnApplicationShutdown {
	constructor(
		private readonly logger: Logger,
		@Inject(REDIS_PUB_CLIENT_TOKEN) private readonly redisPubClient: Redis,
	) {}

	onApplicationShutdown() {
		this.redisPubClient.disconnect()
	}

	public async publish(schema: DataSourceSchema, type: PublishType, id: number | string) {
		if (!id) {
			this.logger.debug(`[WebsocketService] Skipping publish ${schema.table} ${type} as no id provided`)
			return
		}

		this.logger.debug(`[WebsocketService] Publishing ${schema.table} ${type} for #${id}`)
		if (this.redisPubClient.status !== 'ready') {
			throw new Error('Redis client not ready')
		}
		const event: WebsocketRedisEvent = {
			tableName: schema.table,
			publishType: type.toString(),
			primaryKey: schema.primary_key,
			id: id.toString(),
		}
		await this.redisPubClient.publish(WEBSOCKETS_REDIS_CHANNEL, JSON.stringify(event))
	}
}
