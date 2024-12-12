import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common'
import Redis from 'ioredis'

import { Logger } from '../../helpers/Logger'
import { REDIS_PUB_CLIENT_TOKEN, WEBSOCKETS_REDIS_CHANNEL } from './websocket.constants'

@Injectable()
export class WebsocketService implements OnApplicationShutdown {
	constructor(
		private readonly logger: Logger,
		@Inject(REDIS_PUB_CLIENT_TOKEN) private readonly redisPubClient: Redis,
	) {}

	onApplicationShutdown() {
		this.redisPubClient.disconnect()
	}

	public async emit(event: string, data: any, userId?: number) {
		this.logger.debug(`[WebsocketService] Emitting event ${event} to user ${userId || 'ALL'}`)
		if (this.redisPubClient.status !== 'ready') {
			throw new Error('Redis client not ready')
		}
		await this.redisPubClient.publish(WEBSOCKETS_REDIS_CHANNEL, JSON.stringify({ event, data, userId }))
	}
}
