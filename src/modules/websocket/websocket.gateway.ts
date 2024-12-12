import { Inject, OnApplicationShutdown, UseGuards } from '@nestjs/common'
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets'
import Redis from 'ioredis'
import { Server } from 'socket.io'

import { Logger } from '../../helpers/Logger'
import { REDIS_SUB_CLIENT_TOKEN, WebsocketRedisEvent, WEBSOCKETS_REDIS_CHANNEL } from './websocket.constants'
import { WebsocketJwtAuthGuard } from './websocket.jwt-auth.guard'
import { WebsocketJwtAuthMiddleware } from './websocket.jwt-auth.middleware'
import { WebsocketService } from './websocket.service'

/**
 * WebsocketGateway
 * This class is responsible for handling websocket connections and emitting events to connected clients.
 * It also subscribes to a Redis channel to for a multi-instance setup, so that events can be emitted in all instances and sent to all connected clients in all instances.
 */
@UseGuards(WebsocketJwtAuthGuard)
@WebSocketGateway({ cors: true })
export class WebsocketGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
	private connectedUserSockets: Map<number, string> = new Map() // user_id -> socket_id
	@WebSocketServer() server: Server

	constructor(
		private readonly logger: Logger,
		private websocketService: WebsocketService,
		@Inject(REDIS_SUB_CLIENT_TOKEN) private readonly redisSubClient: Redis,
	) {}

	async afterInit(server: Server) {
		server.use(WebsocketJwtAuthMiddleware() as any)
		if (this.server) {
			this.logger.debug('[Websocket] server initialized')
		} else {
			throw new Error('[Websocket] server not initialized')
		}
		await this.subscribeToEvents()
	}

	onApplicationShutdown() {
		this.redisSubClient.disconnect()
	}

	private async subscribeToEvents() {
		await this.redisSubClient.subscribe(WEBSOCKETS_REDIS_CHANNEL, err => {
			if (err) {
				this.logger.error(
					`[Websocket] Failed to subscribe to Redis channel "${WEBSOCKETS_REDIS_CHANNEL}": %s`,
					err.message,
				)
				throw err
			}
		})

		this.redisSubClient.on('message', (channel, message) => {
			const json = JSON.parse(message) as WebsocketRedisEvent
			this.emitToSockets(json)
		})
	}

	private emitToSockets(msg: WebsocketRedisEvent) {
		if (!this.server) throw new Error('[Websocket] Server not initialized')
		if (msg.userId) {
			const socketId = this.connectedUserSockets.get(msg.userId)
			if (socketId) {
				this.logger.debug(
					`[Websocket] Emitting to user ${msg.userId} with socketId ${socketId}. event=${msg.event}`,
				)
				this.server.to(socketId).emit(msg.event, msg.data)
			}
			return
		} else {
			this.logger.debug(`[Websocket] Emitting to all users. event=${msg.event}`)
			this.server.emit(msg.event, msg.data)
		}
	}

	handleConnection(client: any) {
		this.connectedUserSockets.set(client.user.user_id, client.id)
		this.logger.debug(
			`[Websocket]  Client id: ${client.id} connected. user_id=${client.user.user_id}. Number of connected clients: ${this.server.sockets.sockets.size}`,
		)
	}

	handleDisconnect(client: any) {
		this.connectedUserSockets.delete(client.user.user_id)
		this.logger.debug(
			`[Websocket] Cliend id: ${client.id} disconnected. user_id=${client.user.user_id}. Number of connected clients: ${this.server.sockets.sockets.size}`,
		)
	}

	@SubscribeMessage('message')
	handleMessage(client: any, payload: any): string {
		this.logger.log('handleMessage', payload)
		// TBD: Implement
		return 'Client to server messages are not supported.'
	}
}
