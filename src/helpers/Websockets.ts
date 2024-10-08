import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

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


	//https://www.youtube.com/watch?v=4h9-c6D5Pos

	afterInit(client: Socket): void {
		client.use((req, next) =>{


			// RUN Host authentication checks

			// DO Auth Check

			this.logger.log("Socket.io Middlewear") //TODO: debug once working
			console.log(req)
			next()
		})
	}


	async handleConnection(req: any): Promise<void> {
		const ipAddress = req.handshake.address

		// do we know the client and can we link it to the socket.io ID for later use?

		//TODO: debug once working
		this.logger.log(`Client  connected from ${ipAddress}`)

		
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
