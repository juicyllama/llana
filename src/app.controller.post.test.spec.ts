import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { DataSourceSchema } from './types/datasource.types'
import { UserTestingService } from './testing/user.testing.service'
import { Logger } from './helpers/Logger'
import { TIMEOUT } from './testing/testing.const'

describe('App > Controller > Post', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let userTestingService: UserTestingService

	let customerSchema: DataSourceSchema
	let userSchema: DataSourceSchema

	let customer1: any
	let customer2: any
	let customer3: any
	let user: any

	let jwt: string
	let logger = new Logger()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [AuthTestingService, CustomerTestingService, UserTestingService],
			exports: [AuthTestingService, CustomerTestingService, UserTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		userTestingService = app.get<UserTestingService>(UserTestingService)
		
		customerSchema = await customerTestingService.getSchema()
		userSchema = await userTestingService.getSchema()

		jwt = await authTestingService.login()
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 '+expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Create', () => {
		it('Create One', async function () {
			const result = await request(app.getHttpServer())
				.post(`/Customer/`)
				.send(customerTestingService.mockCustomer())
				.set('Authorization', `Bearer ${jwt}`)
				.expect(201)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key]).toBeDefined()
			expect(result.body.companyName).toBeDefined()
			expect(result.body.contactName).toBeDefined()
			customer1 = result.body
		})
		it('Create Many', async function () {
			const result = await request(app.getHttpServer())
				.post(`/Customer/`)
				.send([customerTestingService.mockCustomer(), customerTestingService.mockCustomer()])
				.set('Authorization', `Bearer ${jwt}`)
				.expect(201)
			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toEqual(2)
			expect(result.body.errored).toBeDefined()
			expect(result.body.errored).toEqual(0)
			expect(result.body.successful).toBeDefined()
			expect(result.body.successful).toEqual(2)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][customerSchema.primary_key]).toBeDefined()
			expect(result.body.data[0].companyName).toBeDefined()
			expect(result.body.data[1][customerSchema.primary_key]).toBeDefined()
			expect(result.body.data[1].companyName).toBeDefined()
			customer2 = result.body.data[0]
			customer3 = result.body.data[1]
		})
		it('Create User', async function () {

			user = await userTestingService.mockUser()

			const result = await request(app.getHttpServer())
				.post(`/User/`)
				.send(user)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(201)
				
			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
			expect(result.body.password).toBeDefined()
			expect(result.body.password.startsWith('$2')).toBeTruthy()
			user = result.body
		})
	})

	afterAll(async () => {
		await customerTestingService.deleteCustomer(customer1[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer2[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer3[customerSchema.primary_key])
		await userTestingService.deleteUser(user[userSchema.primary_key])
		await app.close()
	})
})
