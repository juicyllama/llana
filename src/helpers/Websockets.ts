import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { DatabaseSchema, SocketType } from '../types/database.types'
import { Logger } from './Logger'
import { HostCheckMiddleware } from '../middleware/HostCheck'

@WebSocketGateway({
	cors: {
	  origin: '*',
	},
  })
export class Websockets {
	@WebSocketServer()
	server: Server

	constructor(
		private readonly hostCheckMiddleware: HostCheckMiddleware,
		private readonly logger: Logger
	) {}

	//https://www.youtube.com/watch?v=4h9-c6D5Pos

	afterInit(client: Socket): void {
		client.use((req: any, next) =>{

			if(!this.hostCheckMiddleware.validateHost(req.handshake)){
				next(new Error('Forbidden'))		
			}
		
			// RUN Host authentication checks

			// DO Auth Check


			//TODO can we link user_idenitifer (if exists) to socket id?

			
			next()
		})
	}

	async publish(schema: DatabaseSchema, type: SocketType, id: number | string): Promise<void> {
		this.logger.log({
			table: schema.table,
			type,
			[schema.primary_key]: id,
		})

		for (const client of this.server.sockets.sockets) {
			this.logger.log(client)

			//DO VALIDATION CHECKS ON CLIENT

			// this.server.to(client.).emit(DatabaseSchema.table, {
			// 	type,
			// 	[schema.primary_key]: id,
			// });
			// socket.to(id).emit("my message", msg);
		}
	}
}
