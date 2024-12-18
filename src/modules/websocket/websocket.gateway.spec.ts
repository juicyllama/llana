import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as jwt from 'jwt-simple'
import { io, Socket } from 'socket.io-client' // Changed import
import { DataSourceSchema, PublishType, QueryPerform, DataSourceColumnType } from 'src/types/datasource.types'
import { Authentication } from 'src/helpers/Authentication'
import { AppModule } from '../../app.module'
import { WebsocketGateway } from './websocket.gateway'
import { WebsocketService } from './websocket.service'
import { Query } from 'src/helpers/Query'
import { Schema } from 'src/helpers/Schema'

const USER1 = { sub: 'test@test.com' }
const USER2 = { sub: 'test2@test.com' }

const PORT1 = 3001
const PORT2 = 3002

type App = {
	app: INestApplication
	gateway: WebsocketGateway
	service: WebsocketService
	module: TestingModule
}

let mockAuthResponse

describe('WebsocketGateway', () => {
	if (!process.env.JWT_KEY) {
		throw new Error('JWT_KEY not found')
	}

	let app1: App
	let app2: App
	let token1 = jwt.encode(USER1, process.env.JWT_KEY)
	let token2 = jwt.encode(USER2, process.env.JWT_KEY)
	let table1 = 'test_table_1'
	let table2 = 'test_table_2'
	let openSocketsForCleanup: Socket[] = []

	async function listenAndOpenSocket(authToken: string, table: string, port = PORT1) {
		const clientSocket = createSocket(port, authToken, table)
		await waitForSocketToBeReady(clientSocket, 5000)
		openSocketsForCleanup.push(clientSocket)
		return clientSocket
	}

	beforeEach(() => {
		mockAuthResponse = {
			valid: true,
		}
	})

	beforeAll(async () => {
		app1 = await createApp(1, PORT1)
		app2 = await createApp(2, PORT2)
	})

	afterAll(async () => {
		if (app1?.app) await app1.app.close()
		if (app2?.app) await app2.app.close()
	})

	afterEach(async () => {
		openSocketsForCleanup.forEach(socket => {
			socket.close()
		})
		openSocketsForCleanup = []
	})

	it('gateway should be defined', () => {
		expect(app1.gateway).toBeDefined()
	})

	it(`should throw error with an invalid token`, async () => {
		await expect(listenAndOpenSocket('invalid_token', table1)).rejects.toEqual('Timeout')
	})

	it(`should not throw error with a valid token`, async () => {
		await listenAndOpenSocket(token1, table1)
	})

	it(`should send valid message to a user`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1)
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const event = await waitForSocketEvent(clientSocket)
		expect(event).toEqual({
			type: 'INSERT',
			test_id: '12',
		})
	})

	it(`should not sent a message to a user that lacks sufficient permissions on the table`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1)
		mockAuthResponse = {
			valid: false,
		}
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const event = await waitForSocketEvent(clientSocket)
		expect(event).toBeUndefined()
	})

	it(`should send message to two users on same server`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1, PORT1) //
		const user2Socket = await listenAndOpenSocket(token2, table1, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeDefined()
	})

	it(`should send message to two users, each on a different server`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1, PORT1) //
		const user2Socket = await listenAndOpenSocket(token2, table1, PORT2)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeDefined()
	})

	it(`should send message to a on another server`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1, PORT2) // the other app
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const event = await waitForSocketEvent(clientSocket)
		expect(event).toEqual({
			type: 'INSERT',
			test_id: '12',
		})
	})

	it(`should send message to a user on another server (opposite server)`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1, PORT1) // the other app
		app2.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const event = await waitForSocketEvent(clientSocket)
		expect(event).toEqual({
			type: 'INSERT',
			test_id: '12',
		})
	})

	it(`A user should not receive message that was sent not sent about a different table`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1) // user 1
		// user 2
		const user2Socket = await listenAndOpenSocket(token2, table2, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		app1.service.publish({ table: table1, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeUndefined()
	})

	it(`A user should not receive message that was sent about a different table (opposite server)`, async () => {
		const clientSocket = await listenAndOpenSocket(token1, table1) // user 1
		// user 2
		const user2Socket = await listenAndOpenSocket(token2, table2, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		app1.service.publish({ table: table2, primary_key: 'test_id' } as DataSourceSchema, PublishType.INSERT, 12)
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeUndefined()
		expect(eventUser2).toBeDefined()
	})
})

// helpers

async function waitForSocketToBeReady(clientSocket: Socket, timeoutMs: number = 1000) {
	return await new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject('Timeout')
		}, timeoutMs)

		clientSocket.on('connect', () => {
			clearTimeout(timeoutId)
			resolve(1)
		})

		clientSocket.on('error', error => {
			console.error('An error occurred:', error)
			clearTimeout(timeoutId)
			reject('error ' + error)
		})

		clientSocket.on('disconnect', reason => {
			clearTimeout(timeoutId)
			reject('disconnect ' + reason)
		})
	})
}

async function waitForSocketEvent(clientSocket: Socket, timeoutMs: number = 1000) {
	return await new Promise((resolve, reject) => {
		let resolved = false
		const timeoutId = setTimeout(() => {
			resolved = true
			resolve(undefined)
		}, timeoutMs)
		//@ts-ignore
		clientSocket.on(clientSocket['table'], data => {
			if (resolved) return
			clearTimeout(timeoutId)
			resolve(data)
		})
	})
}

let appId = 1
async function createApp(appId: number, port: number) {
	const mockQuery = {
		perform: jest.fn().mockImplementation((type, options) => {
			if (type === QueryPerform.CREATE_TABLE) {
				return true
			}
			if (type === QueryPerform.CREATE) {
				return { ...options.data, id: 1 }
			}
			if (type === QueryPerform.CHECK_CONNECTION) {
				return true
			}
			if (type === QueryPerform.LIST_TABLES) {
				return { tables: [] }
			}
			return null
		}),
	}

	const mockSchema = {
		getSchema: jest.fn().mockImplementation((options) => {
			if (options.table === '_llana_auth') {
				return {
					table: '_llana_auth',
					primary_key: 'id',
					columns: [
						{ field: 'id', type: DataSourceColumnType.NUMBER, auto_increment: true },
						{ field: 'auth', type: DataSourceColumnType.ENUM, enums: ['APIKEY', 'JWT'] },
						{ field: 'type', type: DataSourceColumnType.ENUM, enums: ['INCLUDE', 'EXCLUDE'] },
						{ field: 'table', type: DataSourceColumnType.STRING },
						{ field: 'public_records', type: DataSourceColumnType.ENUM, enums: ['NONE', 'READ', 'WRITE', 'DELETE'] },
					],
					relations: []
				}
			}
			if (options.table === '_llana_webhook') {
				return {
					table: '_llana_webhook',
					primary_key: 'id',
					columns: [
						{ field: 'id', type: DataSourceColumnType.NUMBER, auto_increment: true },
						{ field: 'url', type: DataSourceColumnType.STRING },
						{ field: 'table', type: DataSourceColumnType.STRING },
						{ field: 'type', type: DataSourceColumnType.STRING },
					],
					relations: []
				}
			}
			// Default schema for any other table
			return {
				table: options.table,
				primary_key: 'id',
				columns: [
					{ field: 'id', type: DataSourceColumnType.NUMBER, auto_increment: true }
				],
				relations: []
			}
		}),
	}

	const mockAuth = {
		auth: async () => mockAuthResponse,
		skipAuth: () => true,
		cacheManager: {},
		configService: {
			get: () => ({
				type: 'mysql',
				host: 'mock-host',
				defaults: { limit: 20, relations: { limit: 20 } },
				deletes: { soft: undefined },
			}),
		},
		logger: { log: () => {}, error: () => {}, debug: () => {} },
		query: mockQuery,
		schema: mockSchema,
		jwtService: { verifyAsync: async () => ({}) },
		roles: { rolePass: () => true },
	} as unknown as Authentication

	const module: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideProvider(Query)
		.useValue(mockQuery)
		.overrideProvider(Schema)
		.useValue(mockSchema)
		.compile()

	const gateway = module.get<WebsocketGateway>(WebsocketGateway)
	const service = module.get<WebsocketService>(WebsocketService)

	const app = module.createNestApplication()
	gateway.testInstanceId = ' ' + appId++
	gateway.authentication = mockAuth
	await app.listen(port)
	return { app, gateway, service, module }
}

function createSocket(port: number, token: string, table: string): Socket {
	const socket = io(`http://localhost:${port}`, {
		extraHeaders: {
			authorization: `Bearer ${token}`,
			'x-llana-table': table,
		},
	})
	socket['table'] = table
	return socket
}
