import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { CustomerTestingService } from '../testing/customer.testing.service'
import { Logger } from './Logger'

describe('Query > Create', () => {
	let app: INestApplication
	let logger: Logger
	let customerTestingService: CustomerTestingService

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [CustomerTestingService],
			exports: [CustomerTestingService],
		}).compile()

		app = moduleRef.createNestApplication()

		logger = app.get<Logger>(Logger)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
	})

	describe('createOne', () => {
		it('Inserts a record', async () => {
			try {
				const record = await customerTestingService.createCustomer({})
				expect(record.custId).toBeDefined()
				expect(record.companyName).toEqual('Customer AAAAA')
				expect(record.contactName).toEqual('Doe, Jon')
				expect(record.contactTitle).toEqual('Owner')
				expect(record.address).toEqual('1234 Elm St')
				expect(record.city).toEqual('Springfield')
				expect(record.region).toEqual('IL')
				expect(record.postalCode).toEqual('62701')
				expect(record.country).toEqual('USA')
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
