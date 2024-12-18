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
import { Authentication } from 'src/helpers/Authentication'
import { HostCheckMiddleware } from 'src/middleware/HostCheck'
import { RolePermission } from 'src/types/roles.types'

import { Logger } from '../../helpers/Logger'
import { REDIS_SUB_CLIENT_TOKEN, WebsocketRedisEvent, WEBSOCKETS_REDIS_CHANNEL } from './websocket.constants'
import { WebsocketJwtAuthGuard } from './websocket.jwt-auth.guard'
import { WebsocketJwtAuthMiddleware } from './websocket.jwt-auth.middleware'

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
	private tablesToConnectedUserSockets: Record<string, Record<string, string>> = {} // table_name -> sub -> socket_id
	testInstanceId: string = '' // Used for testing purposes
	authentication: Authentication = this._authentication // Used for testing purposes
	@WebSocketServer() server: Server

	constructor(
		private readonly logger: Logger,
		private readonly _authentication: Authentication,
		private readonly hostCheckMiddleware: HostCheckMiddleware,
		@Inject(REDIS_SUB_CLIENT_TOKEN) private readonly redisSubClient: Redis,
	) {}

	async afterInit(server: Server) {
		server.use(WebsocketJwtAuthMiddleware(this.authentication, this.hostCheckMiddleware) as any)
		if (this.server) {
			this.logger.debug(`[WebsocketGateway${this.testInstanceId}] server initialized`)
		} else {
			throw new Error(`[WebsocketGateway${this.testInstanceId}] server not initialized`)
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
					`[WebsocketGateway${this.testInstanceId}] Failed to subscribe to Redis channel "${WEBSOCKETS_REDIS_CHANNEL}": %s`,
					err.message,
				)
				throw err
			}
		})

		this.redisSubClient.on('message', (channel, message) => {
			this.logger.debug(
				`[WebsocketGateway${this.testInstanceId}] Received message from Redis channel: ${message}`,
			)
			const json = JSON.parse(message) as WebsocketRedisEvent
			this.emitToSockets(json)
		})
	}

	private async emitToSockets(msg: WebsocketRedisEvent) {
		if (!this.server) throw new Error(`[WebsocketGateway${this.testInstanceId}] Server not initialized`)
		this.logger.debug(
			`[WebsocketGateway${this.testInstanceId}] Publishing ${msg.tableName} ${msg.publishType} for #${msg.id}`,
		)
		const userSockets = this.tablesToConnectedUserSockets[msg.tableName]
		if (!userSockets) {
			this.logger.debug(`[WebsocketGateway${this.testInstanceId}] No connected users for table ${msg.tableName}`)
			return
		}
		this.logger.debug(`[WebsocketGateway${this.testInstanceId}] Connected users: ${JSON.stringify(userSockets)}`)

		const emitPromises = Object.entries(userSockets).map(async ([sub, socketId]) => {
			try {
				const auth = await this.authentication.auth({
					table: msg.tableName,
					access: RolePermission.READ,
					user_identifier: sub,
				})
				if (auth.valid) {
					this.logger.debug(
						`[WebsocketGateway${this.testInstanceId}] Emitting ${msg.tableName} ${msg.publishType} for #${msg.id} to ${socketId} (User: ${sub})`,
					)
					const socket = this.server.sockets.sockets.get(socketId)
					if (socket) {
						socket.emit(msg.tableName, {
							type: msg.publishType,
							[msg.primaryKey]: msg.id,
						})
					}
				} else {
					this.logger.debug(
						`[WebsocketGateway${this.testInstanceId}] User ${sub} not authorized to receive event for table ${msg.tableName}`,
					)
				}
			} catch (err) {
				this.logger.error(`[WebsocketGateway${this.testInstanceId}] Error emitting to socket ${socketId}:`, err)
			}
		})

		await Promise.all(emitPromises)
	}

	handleConnection(client: any) {
		if (!client.user?.table || !client.user?.sub) {
			this.logger.error(`[WebsocketGateway${this.testInstanceId}] Client missing user data`, client.user)
			client.disconnect()
			return
		}

		this.tablesToConnectedUserSockets[client.user.table] ||= {}
		const existingSocket = this.tablesToConnectedUserSockets[client.user.table][client.user.sub]
		if (existingSocket) {
			this.logger.debug(
				`[WebsocketGateway${this.testInstanceId}] User ${client.user.sub} already connected to table ${client.user.table}. Disconnecting existing socket ${existingSocket}`,
			)
			this.server.sockets.sockets.get(existingSocket)?.disconnect()
		}
		this.tablesToConnectedUserSockets[client.user.table][client.user.sub] = client.id
		this.logger.debug(
			`[WebsocketGateway${this.testInstanceId}] Client id: ${client.id} connected. table=${client.user.table} sub=${client.user.sub}. Number of connected clients: ${this.server.sockets.sockets.size}`,
		)
	}

	handleDisconnect(client: any) {
		if (client.user?.table && client.user?.sub) {
			delete this.tablesToConnectedUserSockets[client.user.table][client.user.sub]
			this.logger.debug(
				`[WebsocketGateway${this.testInstanceId}] Client id: ${client.id} disconnected. sub=${client.user.sub}. Number of connected clients: ${this.server.sockets.sockets.size}`,
			)
		}
	}

	@SubscribeMessage('message')
	handleMessage(client: any, payload: any): string {
		this.logger.log('handleMessage', payload)
		// TBD: Implement
		throw 'Client to server messages are not supported.'
	}
}
