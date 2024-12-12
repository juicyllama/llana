import { Socket } from 'socket.io'
import { WebsocketJwtAuthGuard } from './websocket.jwt-auth.guard'
import { Logger } from '../../helpers/Logger'

export type SocketIOMiddleware = {
	(client: AuthSocket, next: (err?: Error) => void): void
}

export interface AuthSocket extends Socket {
	user: any
}

const logger = new Logger()

export const WebsocketJwtAuthMiddleware = (): SocketIOMiddleware => {
	return (client: AuthSocket, next) => {
		try {
			const payload = WebsocketJwtAuthGuard.validateToken(client)
			client.user = payload
			logger.debug(`[Websocket] User ${payload.user_id} authenticated`)
			next()
		} catch (err) {
			logger.error(
				`[Websocket] Failed to authenticate user. headers=${JSON.stringify(client.handshake.headers)}`,
				err,
			)
			next(err as Error)
		}
	}
}
