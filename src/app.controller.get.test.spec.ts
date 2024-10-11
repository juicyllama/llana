import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'

describe('App > Controller > Get', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let salesOrderTestingService: SalesOrderTestingService
	
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
		await app.listen(3050)
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		salesOrderTestingService = app.get<SalesOrderTestingService>(SalesOrderTestingService)

		customer = await customerTestingService.createCustomer({})
		salesOrder1 = await salesOrderTestingService.createOrder({ custId: customer.custId, employeeId: 1, shipperId: 1 })
		salesOrder2 = await salesOrderTestingService.createOrder({ custId: customer.custId, employeeId: 1, shipperId: 1 })
		jwt = await authTestingService.login()
	})

	describe('Get', () => {
		it('Get One', async function () {
			const result = await request(app.getHttpServer())
				.get(`/Customer/${customer.custId}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.companyName).toEqual(customer.companyName)
			expect(result.body.contactName).toEqual(customer.contactName)
			expect(result.body.contactTitle).toEqual(customer.contactTitle)
		})

		it('Get One - With Relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/Customer/${customer.custId}?relations=SalesOrder`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
		
				console.log(result.body)

			expect(result.body).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.SalesOrder).toBeDefined()
			expect(result.body.SalesOrder.length).toEqual(2)
			expect(result.body.SalesOrder[0].orderId).toBeDefined()
			expect(result.body.SalesOrder[1].orderId).toBeDefined()
		})
	})

	describe('List', () => {
		it('List All', async function () {
			const result = await request(app.getHttpServer())
				.get(`/Customer/`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0].custId).toBeDefined()
			expect(result.body.data[0].companyName).toBeDefined()
		})
	})

	afterAll(async () => {
		await salesOrderTestingService.deleteOrder(salesOrder1.orderId)
		await salesOrderTestingService.deleteOrder(salesOrder2.orderId)
		await customerTestingService.deleteCustomer(customer.custId)
		await app.close()
	})
})
