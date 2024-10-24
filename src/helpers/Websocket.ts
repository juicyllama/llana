import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Cache } from 'cache-manager'
import { Server, Socket } from 'socket.io'

import { CACHE_DEFAULT_WS_IDENTITY_DATA_TTL } from '../app.constants'
import { HostCheckMiddleware } from '../middleware/HostCheck'
import { DatabaseSchema, PublishType } from '../types/database.types'
import { RolePermission } from '../types/roles.types'
import { Authentication } from './Authentication'
import { Logger } from './Logger'

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class Websocket {
	@WebSocketServer()
	server: Server

	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		private readonly hostCheckMiddleware: HostCheckMiddleware,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
	) {}

	async afterInit(client: Socket): Promise<void> {
		client.use(async (event: any, next) => {
			if (!event.handshake.headers['x-llana-table']) {
				this.logger.debug('[WS] Socket Failed - No table provided')
				this.logger.debug(event.handshake.headers)
				return next(new Error('No Table Provided In Headers[x-llana-table]'))
			}

			if (!this.hostCheckMiddleware.validateHost(event.handshake, '[WS]')) {
				this.logger.debug('[WS] Socket Host Failed - Unauthorized')
				return next(new Error('Forbidden'))
			}

			if (this.authentication.skipAuth()) {
				this.logger.debug(`[WS] Skipping authentication due to SKIP_AUTH being true`)
				return next()
			}

			const jwt_config = this.configService.get<any>('jwt')

			let token = event.handshake.headers.authorization

			if (!token) {
				token = event.handshake.auth.token
			}

			if (!token) {
				this.logger.error('[WS] Socket Auth Failed - No auth token provided')
				return next(new Error('No auth token provided'))
			}

			try {
				const payload = await this.jwtService.verifyAsync(token.replace('Bearer ', ''), {
					secret: jwt_config.secret,
				})

				//if other sockets are connected with the same user and table, disconnect them
				const clients = Array.from(this.server.sockets.sockets.values()).map(socket => {
					return socket.id
				})
				for (const client of clients) {
					const cachedEvent = <any>await this.cacheManager.get(`ws:id:${client}`)
					if (event) {
						if (
							cachedEvent.auth.sub === payload.sub &&
							cachedEvent.table === event.handshake.headers['x-llana-table']
						) {
							this.logger.debug(
								`[WS] Disconnecting duplicate ${client} socket for ${cachedEvent.auth.sub} & ${cachedEvent.table}`,
							)
							this.server.sockets.sockets.get(client).disconnect()
							await this.cacheManager.del(`ws:id:${client}`)
						}
					}
				}

				await this.cacheManager.set(
					`ws:id:${event.id}`,
					{
						auth: payload,
						table: event.handshake.headers['x-llana-table'],
					},
					this.configService.get('CACHE_WS_IDENTITY_DATA_TTL') ?? CACHE_DEFAULT_WS_IDENTITY_DATA_TTL,
				)

				return next()
			} catch (e: any) {
				this.logger.error(`[WS] Socket Auth Failed - ${e.message}`)
				return next(new Error('Forbidden'))
			}
		})
	}

	async publish(schema: DatabaseSchema, type: PublishType, id: number | string): Promise<void> {
		this.logger.debug(`[WS] Publishing ${schema.table} ${type} for #${id}`)

		const clients = Array.from(this.server.sockets.sockets.values()).map(socket => {
			return socket.id
		})

		this.logger.debug(`[WS] Found ${clients.length} users to notify`)

		for (const client of clients) {
			const event = <any>await this.cacheManager.get(`ws:id:${client}`)

			if (!event) {
				this.logger.debug(`[WS] Skipping ${schema.table} ${type} for #${id} to ${client} due to no event`)
				continue
			}

			if (event.table !== schema.table) {
				this.logger.debug(`[WS] Skipping ${schema.table} ${type} for #${id} to ${client} due to table mismatch`)
				continue
			}

			const auth = await this.authentication.auth({
				table: schema.table,
				access: RolePermission.READ,
				user_identifier: event.auth.sub,
			})

			if (!auth.valid) {
				this.logger.debug(
					`[WS] Skipping ${schema.table} ${type} for #${id} to ${client} due to lack of permission`,
				)
				continue
			}

			try {
				this.logger.debug(
					`[WS] Emitting ${schema.table} ${type} for #${id} to ${client} (User: ${event.auth.sub})`,
				)
				this.server.to(client).emit(schema.table, {
					type,
					[schema.primary_key]: id,
				})
			} catch (e) {
				this.logger.error(e)
			}
		}
	}
}
