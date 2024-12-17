import { Socket } from 'socket.io'
import { Authentication } from 'src/helpers/Authentication'
import { HostCheckMiddleware } from 'src/middleware/HostCheck'

import { Logger } from '../../helpers/Logger'
import { WebsocketJwtAuthGuard } from './websocket.jwt-auth.guard'

export type SocketIOMiddleware = {
	(client: AuthSocket, next: (err?: Error) => void): void
}

export interface AuthSocket extends Socket {
	user: {
		sub: string
		table: string
	}
}

const logger = new Logger()

export const WebsocketJwtAuthMiddleware = (
	authentication: Authentication,
	hostCheckMiddleware: HostCheckMiddleware,
): SocketIOMiddleware => {
	return (client: AuthSocket, next) => {
		try {
			if (!client.handshake.headers['x-llana-table']) {
				logger.debug('[WebsocketJwtAuthMiddleware] Socket Failed - No table provided')
				logger.debug(client.handshake.headers)
				return next(new Error('No Table Provided In Headers[x-llana-table]'))
			}

			if (!hostCheckMiddleware.validateHost(client.handshake, '[WebsocketJwtAuthMiddleware]')) {
				logger.debug('[WebsocketJwtAuthMiddleware] Socket Host Failed - Unauthorized')
				return next(new Error('Forbidden'))
			}

			if (authentication.skipAuth()) {
				logger.debug(`[WebsocketJwtAuthMiddleware] Skipping authentication due to SKIP_AUTH being true`)
				return next()
			}

			const payload = WebsocketJwtAuthGuard.validateToken(client)
			client.user = { sub: payload.sub, table: client.handshake.headers['x-llana-table'].toString() }
			logger.debug(`[WebsocketJwtAuthMiddleware] User ${payload.sub} authenticated`)
			next()
		} catch (err) {
			logger.error(
				`[WebsocketJwtAuthMiddleware] Failed to authenticate user. headers=${JSON.stringify(client.handshake.headers)}`,
				err,
			)
			next(err as Error)
		}
	}
}
