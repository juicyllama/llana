import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import * as jwt from 'jwt-simple'
import { Observable } from 'rxjs'
import { Socket } from 'socket.io'

import { Logger } from '../../helpers/Logger'

@Injectable()
export class WebsocketJwtAuthGuard implements CanActivate {
	logger: Logger = new Logger()
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		if (context.getType() !== 'ws') {
			return true
		}

		const client = context.switchToWs().getClient()
		WebsocketJwtAuthGuard.validateToken(client)
		return true
	}

	static validateToken(client: Socket): any {
		const { authorization } = client.handshake.headers
		if (!authorization) {
			throw new Error('Missing authorization header')
		}
		if (!process.env.JWT_KEY) {
			throw new Error('JWT_KEY not found')
		}
		const token: string = authorization.split(' ')[1]
		const payload = jwt.decode(token, process.env.JWT_KEY)
		return payload
	}
}
