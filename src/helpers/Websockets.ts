import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

import { DatabaseSchema, SocketType } from '../types/database.types'
import { Logger } from './Logger'

@WebSocketGateway({
	cors: {
	  origin: '*',
	},
  })
export class Websockets implements OnGatewayConnection {
	@WebSocketServer()
	server: Server

	constructor(private readonly logger: Logger) {}

	async handleConnection(req: any): Promise<void> {
		const ipAddress = req.handshake.address

		//this.logger.debug(`Client connected from ${ipAddress}`);
		this.logger.log(`Client connected from ${ipAddress}`)

		// DOES middlewear run?

		// HOST check
		// Auth Check
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
