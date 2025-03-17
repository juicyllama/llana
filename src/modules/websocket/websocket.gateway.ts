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

import { Authentication } from '../../helpers/Authentication'
import { Logger } from '../../helpers/Logger'
import { Roles } from '../../helpers/Roles'
import { HostCheckMiddleware } from '../../middleware/HostCheck'
import { RolePermission } from '../../types/roles.types'
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
	private tablesToConnectedUserSockets: Record<string, Record<string, string[]>> = {} // table_name -> sub -> socket_id[]
	@WebSocketServer() server: Server

	constructor(
		private readonly logger: Logger,
		private readonly roles: Roles,
		private readonly authentication: Authentication,
		private readonly hostCheckMiddleware: HostCheckMiddleware,
		@Inject(REDIS_SUB_CLIENT_TOKEN) private readonly redisSubClient: Redis,
	) {}

	async afterInit(server: Server) {
		server.use(WebsocketJwtAuthMiddleware(this.authentication, this.hostCheckMiddleware) as any)
		if (this.server) {
			this.logger.debug(`[WebsocketGateway] server initialized`)
		} else {
			throw new Error(`[WebsocketGateway] server not initialized`)
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
					`[WebsocketGateway] Failed to subscribe to Redis channel "${WEBSOCKETS_REDIS_CHANNEL}": %s`,
					err.message,
				)
				throw err
			}
		})

		this.redisSubClient.on('message', (channel, message) => {
			this.logger.debug(`[WebsocketGateway] Received message from Redis channel: ${message}`)
			const json = JSON.parse(message) as WebsocketRedisEvent
			this.emitToSockets(json)
		})
	}

	private async emitToSockets(msg: WebsocketRedisEvent) {
		if (!this.server) throw new Error(`[WebsocketGateway] Server not initialized`)
		this.logger.debug(`[WebsocketGateway] Publishing ${msg.tableName} ${msg.publishType} for #${msg.id}`)
		const userSockets = this.tablesToConnectedUserSockets[msg.tableName] || {}
		this.logger.debug(`[WebsocketGateway] Connected users: ${JSON.stringify(userSockets)}`)
		for (const [sub, socketIds] of Object.entries(userSockets)) {
			for (const socketId of socketIds) {
				const public_auth = await this.authentication.public({
					table: msg.tableName,
					access_level: RolePermission.READ,
				})

				const permission = await this.roles.tablePermission({
					identifier: sub,
					table: msg.tableName,
					access: RolePermission.READ,
				})

				if (!public_auth.valid && !permission.valid) {
					this.logger.debug(
						`[WebsocketGateway] User ${sub} not authorized to receive event for table ${msg.tableName}`,
					)
					continue
				}

				this.logger.debug(
					`[WebsocketGateway] Emitting ${msg.tableName} ${msg.publishType} for #${msg.id} to ${socketId} (User: ${sub})`,
				)
				this.server.to(socketId).emit(msg.tableName, {
					type: msg.publishType,
					[msg.primaryKey]: msg.id,
				})
			}
		}
		return
	}

	handleConnection(client: any) {
		this.tablesToConnectedUserSockets[client.user.table] ||= {}
		this.tablesToConnectedUserSockets[client.user.table][client.user.sub] ||= []
		this.tablesToConnectedUserSockets[client.user.table][client.user.sub].push(client.id)
		this.logger.debug(
			`[WebsocketGateway] Client id: ${client.id} connected. table=${client.user.table} sub=${client.user.sub}. Number of connected clients: ${this.server.sockets.sockets.size}`,
		)
	}

	handleDisconnect(client: any) {
		this.tablesToConnectedUserSockets[client.user.table][client.user.sub] = (
			this.tablesToConnectedUserSockets[client.user.table][client.user.sub] || []
		).filter(socketId => socketId !== client.id)
		this.logger.debug(
			`[WebsocketGateway] Cliend id: ${client.id} disconnected. sub=${client.user.sub}. Number of connected clients: ${this.server.sockets.sockets.size}`,
		)
	}

	@SubscribeMessage('message')
	handleMessage(client: any, payload: any): string {
		this.logger.log('handleMessage', payload)
		// TBD: Implement
		throw 'Client to server messages are not supported.'
	}
}
