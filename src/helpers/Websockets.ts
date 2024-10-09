import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Cache } from 'cache-manager'
import { Server, Socket } from 'socket.io'
import { CACHE_DEFAULT_WS_IDENTITY_DATA_TTL } from '../app.constants'
import { RolePermission } from '../types/roles.types'

import { HostCheckMiddleware } from '../middleware/HostCheck'
import { DatabaseSchema, SocketType } from '../types/database.types'
import { Authentication } from './Authentication'
import { Logger } from './Logger'

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class Websockets {
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
		client.use(async (socket: any, next) => {
			if (!this.hostCheckMiddleware.validateHost(socket.handshake, 'WebSocket')) {
				this.logger.debug('[Websockets] Socket Host Failed - Unauthorized')
				return next(new Error('Forbidden'))
			}

			if (this.authentication.skipAuth()) {
				this.logger.debug(`[Websockets] Skipping authentication due to SKIP_AUTH being true`)
				return next()
			}

			const jwt_config = this.configService.get<any>('jwt')

			let token = socket.handshake.headers.authorization

			if (!token) {
				token = socket.handshake.auth.token
			}

			if (!token) {
				this.logger.error('Socket Auth Failed - No auth token provided')
				return next(new Error('No auth token provided'))
			}

			try {
				const payload = await this.jwtService.verifyAsync(token.replace('Bearer ', ''), {
					secret: jwt_config.secret,
				})

				await this.cacheManager.set(
					`ws:id:${socket.id}`,
					payload,
					this.configService.get('CACHE_WS_IDENTITY_DATA_TTL') ?? CACHE_DEFAULT_WS_IDENTITY_DATA_TTL,
				)

				return next()
			} catch (e: any) {
				this.logger.error(`Socket Auth Failed - ${e.message}`)
				return next(new Error('Forbidden'))
			}
		})
	}

	async publish(schema: DatabaseSchema, type: SocketType, id: number | string): Promise<void> {
		const clients = Array.from(this.server.sockets.sockets.values()).map(socket => {
			return socket.id
		})

		for (const client of clients) {
			const identity = <any>await this.cacheManager.get(`ws:id:${client}`)
			const auth = await this.authentication.auth({
				table: schema.table,
				access: RolePermission.READ,
				user_identifier: identity.sub,
			})

			if (auth.valid) {
				this.logger.debug(
					`[Websockets] Skipping ${schema.table} ${type} for #${id} to ${client} due to lack of permission`,
				)
				continue
			}

			try {
				this.logger.debug(`[Websockets] Emitting ${schema.table} ${type} for #${id} to ${client}`)
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
