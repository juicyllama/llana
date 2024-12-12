import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { io, Socket } from 'socket.io-client' // Changed import
import * as jwt from 'jwt-simple'
import { WebsocketGateway } from './websocket.gateway'
import { WebsocketService } from './websocket.service'
import { WebsocketModule } from './websocket.module'

const USER1 = { email: 'test@test.com', user_id: 1, account_ids: [] }
const USER2 = { email: 'test2@test.com', user_id: 2, account_ids: [] }

const PORT1 = 8998
const PORT2 = 8999

type App = {
	app: INestApplication
	gateway: WebsocketGateway
	service: WebsocketService
	module: TestingModule
}

describe('WebsocketGateway', () => {
	if (!process.env.JWT_KEY) {
		throw new Error('JWT_KEY not found')
	}

	let app1: App
	let app2: App
	let token = jwt.encode(USER1, process.env.JWT_KEY)
	let token2 = jwt.encode(USER2, process.env.JWT_KEY)
	let clientSocket: Socket

	async function listenAndOpenSocket(authToken: string, port = PORT1) {
		clientSocket = createSocket(port, authToken)
		await waitForSocket(clientSocket, 1000)
		// clientSocket.onAny((eventName, ...args) => {
		// 	console.log(`Received event: ${eventName}`)
		// 	console.log(`Arguments: ${args}`)
		// })
	}

	beforeAll(async () => {
		app1 = await createApp(PORT1)
		app2 = await createApp(PORT2)
	})

	afterAll(async () => {
		await app1.app.close()
		await app2.app.close()
	})

	afterEach(async () => {
		clientSocket?.close()
	})

	it('gateway should be defined', () => {
		expect(app1.gateway).toBeDefined()
	})

	it(`should throw error with an invalid token`, async () => {
		await expect(listenAndOpenSocket('invalid_token')).rejects.toEqual('Timeout')
	})

	it(`should not throw error with a valid token`, async () => {
		await listenAndOpenSocket(token)
	})

	it(`should send message to all users`, async () => {
		await listenAndOpenSocket(token)
		app1.service.emit('testABC', { test: 'test123' })
		const event = await connectSocket(clientSocket, 'testABC')
		expect(event).toEqual({ test: 'test123' })
	})

	it(`should send message to two users, each on a different server`, async () => {
		await listenAndOpenSocket(token, PORT1) //
		// user 2
		const user2Socket = createSocket(PORT2, token2)
		await waitForSocket(user2Socket, 1000)

		const promises = [
			connectSocket(clientSocket, 'testTwoServersTwoUsers', 1000),
			connectSocket(user2Socket, 'testTwoServersTwoUsers', 1000),
		]
		app1.service.emit('testTwoServersTwoUsers', { test: 'test123' })
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeDefined()
	})

	it(`should send message to specific user`, async () => {
		await listenAndOpenSocket(token)
		app1.service.emit('testABC', { test: 'test123' }, 1)
		const event = await connectSocket(clientSocket, 'testABC')
		expect(event).toEqual({ test: 'test123' })
	})

	it(`should not send message to specific user if user is not connected`, async () => {
		await listenAndOpenSocket(token)
		app1.service.emit('testABC', { test: 'test123' }, 2)
	})

	it(`A user should not receive message that was not sent to him`, async () => {
		await listenAndOpenSocket(token) // user 1
		// user 2
		const user2Socket = createSocket(PORT1, token2)
		await waitForSocket(user2Socket, 1000)

		const promises = [connectSocket(clientSocket, 'testABC', 1000), connectSocket(user2Socket, 'testABC', 1000)]
		app1.service.emit('testABC', { test: 'test123' }, 2) // send to user 2
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeUndefined()
		expect(eventUser2).toBeDefined()
	})

	it(`A user should not receive message that was not sent to him (opposite user)`, async () => {
		await listenAndOpenSocket(token) // user 1

		// user 2
		const user2Socket = createSocket(PORT1, token2)
		await waitForSocket(user2Socket, 1000)

		const promises = [connectSocket(clientSocket, 'testABC', 1000), connectSocket(user2Socket, 'testABC', 1000)]
		app1.service.emit('testABC', { test: 'test123' }, 1) // send to user 2
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeUndefined()
	})

	it(`should send message to specific user on another server`, async () => {
		await listenAndOpenSocket(token, PORT2) // the other app
		app1.service.emit('testABC', { test: 'test1235' }, 1)
		const event = await connectSocket(clientSocket, 'testABC')
		expect(event).toEqual({ test: 'test1235' })
	})

	it(`should send message to specific user on another server (opposite apps)`, async () => {
		await listenAndOpenSocket(token, PORT1) // the other app
		app2.service.emit('testABC', { test: 'test1236' }, 1)
		const event = await connectSocket(clientSocket, 'testABC')
		expect(event).toEqual({ test: 'test1236' })
	})
})

// helpers

async function waitForSocket(clientSocket: Socket, timeoutMs: number = 1000) {
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

async function connectSocket(clientSocket: Socket, eventName: string, timeoutMs: number = 1000) {
	return await new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			resolve(undefined)
		}, timeoutMs)
		clientSocket.on(eventName, data => {
			clearTimeout(timeoutId)
			resolve(data)
		})
	})
}

async function createApp(port: number): Promise<App> {
	const module: TestingModule = await Test.createTestingModule({
		imports: [WebsocketModule],
	}).compile()
	const gateway = module.get<WebsocketGateway>(WebsocketGateway)
	const service = module.get<WebsocketService>(WebsocketService)

	const app = module.createNestApplication()
	await app.listen(port)
	return { app, gateway, service, module }
}

function createSocket(port: number, token: string): Socket {
	return io(`http://localhost:${port}`, { // Changed to io
		extraHeaders: {
			authorization: `Bearer ${token}`,
		},
	})
}
