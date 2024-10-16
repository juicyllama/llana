import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { DatabaseSchema } from './types/database.types'

describe('App > Controller > Get', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let salesOrderTestingService: SalesOrderTestingService

	let customerSchema: DatabaseSchema
	let salesOrderSchema: DatabaseSchema

	let customer: any
	let salesOrder1: any
	let salesOrder2: any

	let jwt: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [AuthTestingService, CustomerTestingService, SalesOrderTestingService],
			exports: [AuthTestingService, CustomerTestingService, SalesOrderTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.listen(process.env.PORT ?? 3000)
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		salesOrderTestingService = app.get<SalesOrderTestingService>(SalesOrderTestingService)

		customerSchema = await customerTestingService.getSchema()
		salesOrderSchema = await salesOrderTestingService.getSchema()

		customer = await customerTestingService.createCustomer({})
		salesOrder1 = await salesOrderTestingService.createOrder({
			custId: customer[customerSchema.primary_key],
			employeeId: 1,
			shipperId: 1,
		})
		salesOrder2 = await salesOrderTestingService.createOrder({
			custId: customer[customerSchema.primary_key],
			employeeId: 1,
			shipperId: 1,
		})

		jwt = await authTestingService.login()
	})

	describe('Get', () => {
		it('Get One', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${salesOrder1[salesOrderSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.employeeId).toBeDefined()
			expect(result.body.shipperId).toBeDefined()
			expect(result.body.shipName).toBeDefined()
		})

		it('Get One - With Relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${salesOrder1[salesOrderSchema.primary_key]}?relations=Customer`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.employeeId).toBeDefined()
			expect(result.body.shipperId).toBeDefined()
			expect(result.body.shipName).toBeDefined()
			expect(result.body.Customer[0]).toBeDefined()
			expect(result.body.Customer[0].contactName).toBeDefined()
		})
	})

	describe('List', () => {
		it('List All', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.data[0].shipName).toBeDefined()
		})

		it('List All - With Relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/?relations=Customer`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.data[0].shipName).toBeDefined()
			expect(result.body.data[0].Customer[0]).toBeDefined()
			expect(result.body.data[0].Customer[0].contactName).toBeDefined()
		})
	})

	afterAll(async () => {
		await salesOrderTestingService.deleteOrder(salesOrder1[salesOrderSchema.primary_key])
		await salesOrderTestingService.deleteOrder(salesOrder2[salesOrderSchema.primary_key])
		await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		await app.close()
	})
})
