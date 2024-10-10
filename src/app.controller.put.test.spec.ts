import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'

describe('App > Controller > Put', () => {
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

	describe('Update', () => {
		it('Update One', async function () {
			const result = await request(app.getHttpServer())
			.put(`/Customer/${customer.custId}`)
			.send({
				companyName: 'Updated Company Name',
				contactName: 'Updated Contact Name',
			})
			.set('Authorization', `Bearer ${jwt}`)
			.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.custId).toEqual(customer.custId)
			expect(result.body.companyName).toEqual('Updated Company Name')
			expect(result.body.contactName).toEqual('Updated Contact Name')
			customer = result.body
		})
	})

	afterAll(async () => {
		await customerTestingService.deleteCustomer(customer.custId)
		await app.close()
	})
})
