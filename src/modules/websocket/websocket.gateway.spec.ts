import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as jsonwebtoken from 'jsonwebtoken'
import { io, Socket } from 'socket.io-client' // Changed import
import { DataSourceSchema, PublishType } from 'src/types/datasource.types'
import { AppModule } from '../../app.module'
import { WebsocketGateway } from './websocket.gateway'
import { WebsocketService } from './websocket.service'
import { CustomerTestingService } from '../../testing/customer.testing.service'
import { SalesOrderTestingService } from '../../testing/salesorder.testing.service'
import { UserTestingService } from '../../testing/user.testing.service'
import { RolePermission } from '../../types/roles.types'
import { Logger } from '../../helpers/Logger'
import { AuthTestingService } from '../../testing/auth.testing.service'

const logger = new Logger()

const customers = []
const orders = []
const users = []
const tokens = []

const PORT1 = 8998
const PORT2 = 8999

type App = {
	app: INestApplication
	gateway: WebsocketGateway
	service: WebsocketService
	module: TestingModule
}

let mockAuthResponse
let authTestingService: AuthTestingService
let customerTestingService: CustomerTestingService
let salesOrderTestingService: SalesOrderTestingService
let userTestingService: UserTestingService

let customerSchema: DataSourceSchema
let salesOrderSchema: DataSourceSchema
let usersSchema: DataSourceSchema

describe('WebsocketGateway', () => {
	if (!process.env.JWT_KEY) {
		throw new Error('JWT_KEY not found')
	}

	let app1: App
	let app2: App

	let openSocketsForCleanup: Socket[] = []

	async function listenAndOpenSocket(authToken: string, table: string, port = PORT1) {
		const clientSocket = createSocket(port, authToken, table)
		await waitForSocketToBeReady(clientSocket, 1000)
		openSocketsForCleanup.push(clientSocket)
		return clientSocket
	}

	beforeEach(() => {
		mockAuthResponse = {
			valid: true,
		}
	})

	beforeAll(async () => {
		app1 = await createApp(PORT1)
		app2 = await createApp(PORT2)
	})

	afterAll(async () => {
		await app1.app.close()
		await app2.app.close()

		for (const customer of customers) {
			await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		}

		for (const order of orders) {
			await salesOrderTestingService.deleteOrder(order[salesOrderSchema.primary_key])
		}

		for (const user of users) {
			await userTestingService.deleteUser(user[usersSchema.primary_key])
		}
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
		await expect(listenAndOpenSocket('invalid_token', customerSchema.table)).rejects.toEqual('Timeout')
	})

	it(`should not throw error with a valid token`, async () => {
		await listenAndOpenSocket(tokens[0], customerSchema.table)
	})

	it(`should send valid message to a user`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table)
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])
		const event = await waitForSocketEvent(clientSocket)

		expect(event).toEqual({
			type: 'INSERT',
			[customerSchema.primary_key]: customer[customerSchema.primary_key].toString(),
		})
	})

	it(`should not sent a message to a user that lacks sufficient permissions on the table`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table)

		const role = await authTestingService.createRole({
			custom: true,
			table: customerSchema.table,
			identity_column: 'userId',
			role: 'USER',
			records: RolePermission.NONE,
			own_records: RolePermission.NONE,
		})

		try {
			const customer = await customerTestingService.createCustomer({
				userId: users[0][usersSchema.primary_key],
			})
			customers.push(customer)
			app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])
			const event = await waitForSocketEvent(clientSocket)
			expect(event).toBeUndefined()
		} catch (e) {
			logger.error(e)
			throw e
		} finally {
			await authTestingService.deleteRole(role)
		}
	})

	it(`should send message to two users on same server`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table, PORT1) //
		const user2Socket = await listenAndOpenSocket(tokens[1], customerSchema.table, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])

		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeDefined()
	})

	it(`should send message to two users, each on a different server`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table, PORT1) //
		const user2Socket = await listenAndOpenSocket(tokens[1], customerSchema.table, PORT2)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])

		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeDefined()
	})

	it(`should send message to a on another server`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table, PORT2) // the other app
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])

		const event = await waitForSocketEvent(clientSocket)
		expect(event).toEqual({
			type: 'INSERT',
			[customerSchema.primary_key]: customer[customerSchema.primary_key].toString(),
		})
	})

	it(`should send message to a user on another server (opposite server)`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table, PORT1) // the other app
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app2.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])
		const event = await waitForSocketEvent(clientSocket)
		expect(event).toEqual({
			type: 'INSERT',
			[customerSchema.primary_key]: customer[customerSchema.primary_key].toString(),
		})
	})

	it(`A user should not receive message that was sent not sent about a different table`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table) // user 1
		// user 2
		const user2Socket = await listenAndOpenSocket(tokens[1], salesOrderSchema.table, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(customerSchema, PublishType.INSERT, customer[customerSchema.primary_key])
		const [eventUser1, eventUser2] = await Promise.all(promises)
		user2Socket.close()
		expect(eventUser1).toBeDefined()
		expect(eventUser2).toBeUndefined()
	})

	it(`A user should not receive message that was sent about a different table (opposite server)`, async () => {
		const clientSocket = await listenAndOpenSocket(tokens[0], customerSchema.table) // user 1
		// user 2
		const user2Socket = await listenAndOpenSocket(tokens[1], salesOrderSchema.table, PORT1)

		const promises = [waitForSocketEvent(clientSocket), waitForSocketEvent(user2Socket)]
		const customer = await customerTestingService.createCustomer({
			userId: users[0][usersSchema.primary_key],
		})
		customers.push(customer)
		app1.service.publish(salesOrderSchema, PublishType.INSERT, customer[customerSchema.primary_key])
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

async function createApp(port: number): Promise<App> {
	const module: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
		providers: [CustomerTestingService, SalesOrderTestingService, UserTestingService, AuthTestingService],
		exports: [CustomerTestingService, SalesOrderTestingService, UserTestingService, AuthTestingService],
	}).compile()
	const gateway = module.get<WebsocketGateway>(WebsocketGateway)
	const service = module.get<WebsocketService>(WebsocketService)

	customerTestingService = module.get<CustomerTestingService>(CustomerTestingService)
	salesOrderTestingService = module.get<SalesOrderTestingService>(SalesOrderTestingService)
	userTestingService = module.get<UserTestingService>(UserTestingService)
	authTestingService = module.get<AuthTestingService>(AuthTestingService)

	customerSchema = await customerTestingService.getSchema()
	salesOrderSchema = await salesOrderTestingService.getSchema()
	usersSchema = await userTestingService.getSchema()

	const app = module.createNestApplication()
	await app.listen(port)

	const user1 = await userTestingService.createUser({})
	const user2 = await userTestingService.createUser({})

	users.push(user1, user2)
	tokens.push(
		jsonwebtoken.sign({ sub: user1[usersSchema.primary_key], email: user1.email }, process.env.JWT_KEY),
		jsonwebtoken.sign({ sub: user2[usersSchema.primary_key], email: user2.email }, process.env.JWT_KEY),
	)

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
