import { faker } from '@faker-js/faker'
import { Test, TestingModule } from '@nestjs/testing'
import { DeleteResponseObject, FindOneResponseObject } from 'src/types/response.types'

import { AppModule } from '../app.module'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Delete', () => {
	let app: TestingModule
	let service: Query
	let schema: Schema
	let logger: Logger
	let usersTableSchema: DatabaseSchema

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		usersTableSchema = await schema.getSchema('User')
	})

	describe('Hard Deletes', () => {
		it('Invalid Id', async () => {
			try {
				const results = (await service.perform(QueryPerform.DELETE, {
					id: '999999',
					schema: usersTableSchema,
				})) as DeleteResponseObject
				expect(results.deleted).toEqual(0)
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Valid Id - Hard', async () => {
			try {
				const user = (await service.perform(QueryPerform.CREATE, {
					schema: usersTableSchema,
					data: {
						email: faker.internet.email(),
						password: faker.internet.password(),
					},
				})) as FindOneResponseObject

				const results = (await service.perform(QueryPerform.DELETE, {
					id: user[usersTableSchema.primary_key],
					schema: usersTableSchema,
				})) as DeleteResponseObject
				expect(results.deleted).toEqual(1)

				const deleted_record = (await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [
						{ column: 'id', operator: WhereOperator.equals, value: user[usersTableSchema.primary_key] },
					],
				})) as FindOneResponseObject

				expect(JSON.stringify(deleted_record)).toBe('{}')
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	describe('Soft Deletes', () => {
		it('Valid Id - Soft', async () => {
			try {
				const user = (await service.perform(QueryPerform.CREATE, {
					schema: usersTableSchema,
					data: {
						email: faker.internet.email(),
						password: faker.internet.password(),
					},
				})) as FindOneResponseObject

				const results = (await service.perform(QueryPerform.DELETE, {
					id: user[usersTableSchema.primary_key],
					schema: usersTableSchema,
					softDelete: 'deletedAt',
				})) as DeleteResponseObject
				expect(results.deleted).toEqual(1)

				const deleted_record = (await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [
						{ column: 'id', operator: WhereOperator.equals, value: user[usersTableSchema.primary_key] },
					],
				})) as FindOneResponseObject

				expect(deleted_record).toBeDefined()
				expect(deleted_record.deletedAt).toBeDefined()
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
