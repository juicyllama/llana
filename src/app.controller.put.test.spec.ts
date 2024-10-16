import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { DatabaseSchema } from './types/database.types'

describe('App > Controller > Put', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService

	let customerSchema: DatabaseSchema

	let customer1: any
	let customer2: any
	let customer3: any

	let jwt: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [AuthTestingService, CustomerTestingService],
			exports: [AuthTestingService, CustomerTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)

		customerSchema = await customerTestingService.getSchema()

		customer1 = await customerTestingService.createCustomer({})
		customer2 = await customerTestingService.createCustomer({})
		customer3 = await customerTestingService.createCustomer({})
		jwt = await authTestingService.login()
	})

	describe('Update', () => {
		it('Update One', async function () {
			const result = await request(app.getHttpServer())
				.put(`/Customer/${customer1[customerSchema.primary_key]}`)
				.send({
					companyName: 'Updated Company Name',
					contactName: 'Updated Contact Name',
				})
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key].toString()).toEqual(
				customer1[customerSchema.primary_key].toString(),
			)
			expect(result.body.companyName).toEqual('Updated Company Name')
			expect(result.body.contactName).toEqual('Updated Contact Name')
			customer1 = result.body
		})
		it('Update Many', async function () {
			customer2.companyName = 'Customer2 Company Name'
			customer3.companyName = 'Customer2 Company Name'

			const result = await request(app.getHttpServer())
				.put(`/Customer/`)
				.send([
					{
						[customerSchema.primary_key]: customer2[customerSchema.primary_key],
						companyName: customer2.companyName,
					},
					{
						[customerSchema.primary_key]: customer3[customerSchema.primary_key],
						companyName: customer3.companyName,
					},
				])
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toEqual(2)
			expect(result.body.errored).toBeDefined()
			expect(result.body.errored).toEqual(0)
			expect(result.body.successful).toBeDefined()
			expect(result.body.successful).toEqual(2)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][customerSchema.primary_key].toString()).toEqual(
				customer2[customerSchema.primary_key].toString(),
			)
			expect(result.body.data[0].companyName).toEqual(customer2.companyName)
			expect(result.body.data[0].contactName).toEqual(customer2.contactName)
			expect(result.body.data[1][customerSchema.primary_key].toString()).toEqual(
				customer3[customerSchema.primary_key].toString(),
			)
			expect(result.body.data[1].companyName).toEqual(customer3.companyName)
			expect(result.body.data[1].contactName).toEqual(customer3.contactName)
			customer2 = result.body.data[0]
			customer3 = result.body.data[1]
		})
	})

	afterAll(async () => {
		await customerTestingService.deleteCustomer(customer1[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer2[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer3[customerSchema.primary_key])
		await app.close()
	})
})
