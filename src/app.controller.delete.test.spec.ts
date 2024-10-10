import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'

describe('App > Controller > Delete', () => {
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

	describe('Delete', () => {
		it('Delete One', async function () {
			await request(app.getHttpServer())
			.delete(`/Customer/${customer.custId}`)
			.set('Authorization', `Bearer ${jwt}`)
			.expect(200)
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
