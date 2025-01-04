import { Socket } from 'socket.io'
import { Authentication } from 'src/helpers/Authentication'
import { HostCheckMiddleware } from 'src/middleware/HostCheck'
import { RolePermission } from 'src/types/roles.types'
import { Logger } from '../../helpers/Logger'

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
	return async (client: AuthSocket, next) => {
		try {
			if (!client.handshake.headers['x-llana-table']) {
				logger.debug('[WebsocketJwtAuthMiddleware] Socket Failed - No table provided')
				logger.debug(client.handshake.headers)
				return next(new Error('No Table Provided In Headers[x-llana-table]'))
			}

			const table = client.handshake.headers['x-llana-table'].toString()

			if (!hostCheckMiddleware.validateHost(client.handshake, '[WebsocketJwtAuthMiddleware]')) {
				logger.debug('[WebsocketJwtAuthMiddleware] Socket Host Failed - Unauthorized')
				return next(new Error('Forbidden'))
			}

			// Check if table is public
			const public_auth = await authentication.public({
				table,
				access_level: RolePermission.READ,
				x_request_id: client.handshake.headers['x-request-id']?.toString(),
			})

			if (public_auth.valid) {
				client.user = { sub: 'public', table }
				logger.debug(`[WebsocketJwtAuthMiddleware] Public access granted for table ${table}`)
				return next()
			}

			if (authentication.skipAuth()) {
				logger.debug(`[WebsocketJwtAuthMiddleware] Skipping authentication due to SKIP_AUTH being true`)
				return next()
			}

			// Authenticate using JWT
			const auth = await authentication.auth({
				table,
				access: RolePermission.READ,
				headers: client.handshake.headers,
				x_request_id: client.handshake.headers['x-request-id']?.toString(),
			})

			if (!auth.valid) {
				logger.error(`[WebsocketJwtAuthMiddleware] Authentication failed: ${auth.message}`)
				return next(new Error(auth.message))
			}

			client.user = { sub: auth.user_identifier.toString(), table }
			logger.debug(`[WebsocketJwtAuthMiddleware] User ${auth.user_identifier} authenticated`)
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
