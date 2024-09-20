import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { CustomerTestingService } from '../testing/customer.testing.service'
import { UserTestingService } from '../testing/user.testing.service'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Update', () => {
	let app: INestApplication
	let service: Query
	let schema: Schema
	let logger: Logger
	let customerTestingService: CustomerTestingService
	let customerTableSchema: DatabaseSchema
	let userTestingService: UserTestingService
	let userTableSchema: DatabaseSchema

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [CustomerTestingService, UserTestingService],
			exports: [CustomerTestingService, UserTestingService],
		}).compile()

		app = moduleRef.createNestApplication()

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		customerTableSchema = await schema.getSchema({ table: 'Customer' })
		userTestingService = app.get<UserTestingService>(UserTestingService)
		userTableSchema = await schema.getSchema({ table: 'User' })
	})

	describe('update', () => {
		it('Updates a record', async () => {
			try {
				const record = await customerTestingService.createCustomer({})
				expect(record[customerTableSchema.primary_key]).toBeDefined()

				const updatedRecord = (await service.perform(QueryPerform.UPDATE, {
					id: record[customerTableSchema.primary_key],
					schema: customerTableSchema,
					where: [
						{
							column: customerTableSchema.primary_key,
							operator: WhereOperator.equals,
							value: record[customerTableSchema.primary_key],
						},
					],
					data: {
						address: '1600 Pennsylvania Avenue',
						city: 'Washington',
						region: 'DC',
						postalCode: '20500',
					},
				})) as FindOneResponseObject
				expect(updatedRecord[customerTableSchema.primary_key]).toBeDefined()
				expect(updatedRecord.companyName).toBeDefined()
				expect(updatedRecord.contactName).toBeDefined()
				expect(updatedRecord.contactTitle).toBeDefined()
				expect(updatedRecord.address).toEqual('1600 Pennsylvania Avenue')
				expect(updatedRecord.city).toEqual('Washington')
				expect(updatedRecord.region).toEqual('DC')
				expect(updatedRecord.postalCode).toEqual('20500')
				expect(updatedRecord.country).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	describe('Create a user', () => {
		it('Did it encrypt the password?', async () => {
			try {
				let user = await userTestingService.createUser({})

				user = (await service.perform(QueryPerform.UPDATE, {
					id: user[userTableSchema.primary_key],
					schema: userTableSchema,
					where: [
						{
							column: userTableSchema.primary_key,
							operator: WhereOperator.equals,
							value: user[userTableSchema.primary_key],
						},
					],
					data: {
						password: 'password',
					},
				})) as FindOneResponseObject
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
