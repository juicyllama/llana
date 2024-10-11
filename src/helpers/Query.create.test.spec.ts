import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { CustomerTestingService } from '../testing/customer.testing.service'
import { UserTestingService } from '../testing/user.testing.service'
import { Logger } from './Logger'

describe('Query > Create', () => {
	let app: INestApplication
	let logger: Logger
	let customerTestingService: CustomerTestingService
	let userTestingService: UserTestingService

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [CustomerTestingService, UserTestingService],
			exports: [CustomerTestingService, UserTestingService],
		}).compile()

		app = moduleRef.createNestApplication()

		logger = app.get<Logger>(Logger)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		userTestingService = app.get<UserTestingService>(UserTestingService)
	})

	describe('create', () => {
		it('Inserts a record', async () => {
			try {
				const record = await customerTestingService.createCustomer({})
				expect(record.companyName).toBeDefined()
				expect(record.contactName).toBeDefined()
				expect(record.contactTitle).toBeDefined()
				expect(record.address).toBeDefined()
				expect(record.city).toBeDefined()
				expect(record.region).toBeDefined()
				expect(record.postalCode).toBeDefined()
				expect(record.country).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	describe('Create a user', () => {
		it('Did it encrypt the password?', async () => {
			try {
				const user = await userTestingService.createUser({})
				expect(user.email).toBeDefined()
				expect(user.password).toBeDefined()
				expect(user.password.startsWith('$2')).toBeTruthy()
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
