import { Logger } from '../../helpers/Logger'
import { Module, Global } from '@nestjs/common'
import { WebsocketGateway } from './websocket.gateway'
import { WebsocketService } from './websocket.service'
import { REDIS_PUB_CLIENT_TOKEN, REDIS_SUB_CLIENT_TOKEN } from './websocket.constants'
import Redis from 'ioredis'

function createRedisClient() {
	if (!process.env.REDIS_PORT || !process.env.REDIS_HOST) {
		throw new Error('REDIS_PORT or REDIS_HOST not found')
	}
	return new Redis(+process.env.REDIS_PORT, process.env.REDIS_HOST, {})
}

@Global()
@Module({
	providers: [
		Logger,
		WebsocketGateway,
		WebsocketService,
		{
			provide: REDIS_PUB_CLIENT_TOKEN,
			useFactory: createRedisClient,
		},
		{
			provide: REDIS_SUB_CLIENT_TOKEN, // A redis client, once subscribed to events, cannot be used for publishing events unfortunately
			useFactory: createRedisClient,
		},
	],
	exports: [WebsocketService, WebsocketGateway, REDIS_PUB_CLIENT_TOKEN, REDIS_SUB_CLIENT_TOKEN],
})
export class WebsocketModule {}
