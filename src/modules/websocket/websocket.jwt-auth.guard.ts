import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import * as jsonwebtoken from 'jsonwebtoken'
import { Socket } from 'socket.io'

import { Logger } from '../../helpers/Logger'

@Injectable()
export class WebsocketJwtAuthGuard implements CanActivate {
	logger: Logger = new Logger()

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (context.getType() !== 'ws') {
			return true
		}

		const client = context.switchToWs().getClient<Socket>()
		const isValid = await WebsocketJwtAuthGuard.validateToken(client)

		if (!isValid) {
			this.logger.warn('[Websocket] WebSocket authentication failed, disconnecting client...')
			client.disconnect() // ✅ Disconnect unauthorized clients
			return false
		}

		return true
	}

	static async validateToken(client: Socket): Promise<any> {
		const logger: Logger = new Logger()

		const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization // ✅ Allow token from handshake.auth // ✅ Support headers

		if (!authHeader || !authHeader.includes('Bearer')) {
			logger.error('[Websocket] No token provided')
			return false // ❌ No token provided
		}

		const token = authHeader.split(' ')[1]

		if (!process.env.JWT_KEY) {
			logger.error('[Websocket] JWT_KEY is missing from environment variables!')
			return false
		}

		try {
			// ✅ Use `jsonwebtoken.verify()` to validate signature and expiration
			const payload = jsonwebtoken.verify(token, process.env.JWT_KEY)
			client.data.user = payload // ✅ Attach user to socket for easy access
			return payload
		} catch (error) {
			logger.error('[Websocket] Invalid WebSocket token: ', error.message)
			return false
		}
	}
}
