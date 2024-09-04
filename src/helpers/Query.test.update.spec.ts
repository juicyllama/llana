import { Test, TestingModule } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { FindOneResponseObject } from '../types/response.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Update', () => {
	let app: TestingModule
	let service: Query
	let schema: Schema
	let logger: Logger
	let customerTableSchema: DatabaseSchema

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		customerTableSchema = await schema.getSchema('Customer')
	})

	describe('updateOne', () => {
		it('Updates a record', async () => {
			try {
				const record = (await service.perform(QueryPerform.CREATE, {
					schema: customerTableSchema,
					data: {
						companyName: 'Customer AAAAA',
						contactName: 'Doe, Jon',
						contactTitle: 'Owner',
						address: '1234 Elm St',
						city: 'Springfield',
						region: 'IL',
						postalCode: '62701',
						country: 'USA',
					},
				})) as FindOneResponseObject

				expect(record.custId).toBeDefined()

				const updatedRecord = (await service.perform(QueryPerform.UPDATE, {
					id: record.custId,
					schema: customerTableSchema,
					where: [{ column: 'custId', operator: WhereOperator.equals, value: record.custId }],
					data: {
						address: '1600 Pennsylvania Avenue',
						city: 'Washington',
						region: 'DC',
						postalCode: '20500',
					},
				})) as FindOneResponseObject
				expect(updatedRecord.custId).toBeDefined()
				expect(updatedRecord.companyName).toEqual('Customer AAAAA')
				expect(updatedRecord.contactName).toEqual('Doe, Jon')
				expect(updatedRecord.contactTitle).toEqual('Owner')
				expect(updatedRecord.address).toEqual('1600 Pennsylvania Avenue')
				expect(updatedRecord.city).toEqual('Washington')
				expect(updatedRecord.region).toEqual('DC')
				expect(updatedRecord.postalCode).toEqual('20500')
				expect(updatedRecord.country).toEqual('USA')
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
