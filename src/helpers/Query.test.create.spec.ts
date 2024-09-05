import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { DatabaseSchema, QueryPerform } from '../types/database.types'
import { FindOneResponseObject } from '../types/response.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Create', () => {
	let app: INestApplication
	let service: Query
	let schema: Schema
	let logger: Logger
	let customerTableSchema: DatabaseSchema

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		customerTableSchema = await schema.getSchema('Customer')
	})

	describe('createOne', () => {
		it('Inserts a record', async () => {
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
