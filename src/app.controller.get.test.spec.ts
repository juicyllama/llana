import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'

describe('App > Controller > Get', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let customer: any

	let jwt: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [AuthTestingService, CustomerTestingService],
			exports: [AuthTestingService, CustomerTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.listen(3050)
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)

		customer = await customerTestingService.createCustomer({})
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
		await customerTestingService.deleteCustomer(customer.custId)
		await app.close()
	})
})
