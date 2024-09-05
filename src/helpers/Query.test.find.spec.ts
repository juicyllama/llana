import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { FindManyResponseObject, FindOneResponseObject } from '../types/response.types'
import { Logger, logLevel } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Find', () => {
	let app: INestApplication
	let service: Query
	let schema: Schema
	let logger: Logger
	let usersTableSchema: DatabaseSchema
	let customerTableSchema: DatabaseSchema
	let salesOrderTableSchema: DatabaseSchema

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication({
			logger: logLevel(),
		})

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		usersTableSchema = await schema.getSchema('User')
		customerTableSchema = await schema.getSchema('Customer')
		salesOrderTableSchema = await schema.getSchema('SalesOrder')
	})

	describe('findOne', () => {
		it('Invalid Id', async () => {
			try {
				const results = await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '9999' }],
				})
				expect(results).toEqual({})
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Valid Id', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '1' }],
				})) as FindOneResponseObject
				expect(results.id).toEqual(1)
				expect(results.email).toEqual('test@test.com')
				expect(results.firstName).toEqual('Jon')
				expect(results.lastName).toEqual('Doe')
				expect(results.role).toEqual('ADMIN')
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Fields', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '1' }],
					fields: ['id', 'email'],
				})) as FindOneResponseObject
				expect(results.id).toEqual(1)
				expect(results.email).toEqual('test@test.com')
				expect(results.firstName).toBeUndefined()
				expect(results.lastName).toBeUndefined()
				expect(results.role).toBeUndefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing filters', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [
						{ column: 'id', operator: WhereOperator.equals, value: '1' },
						{ column: 'email', operator: WhereOperator.equals, value: 'test@test.com' },
					],
					fields: ['id', 'email'],
				})) as FindOneResponseObject
				expect(results.id).toEqual(1)
				expect(results.email).toEqual('test@test.com')
				expect(results.firstName).toBeUndefined()
				expect(results.lastName).toBeUndefined()
				expect(results.role).toBeUndefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	describe('findMany', () => {
		it('Passing Fields', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: customerTableSchema,
					fields: ['custId', 'companyName'],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].companyName).toBeDefined()
				expect(results.data[0].address).toBeUndefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Where', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: customerTableSchema,
					where: [{ column: 'companyName', operator: WhereOperator.search, value: 'NRZBB' }],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].companyName).toBe('Customer NRZBB')
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Relations', async () => {
			salesOrderTableSchema.relations.find(r => r.table === 'Customer').schema = customerTableSchema

			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer[0].companyName).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Relations (with Join override)', async () => {
			salesOrderTableSchema.relations.find(r => r.table === 'Customer').schema = customerTableSchema

			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer[0].companyName).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Limit', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
					limit: 3,
				})) as FindManyResponseObject
				expect(results.data.length).toEqual(3)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer[0].companyName).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Offset', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer[0].companyName).toBeDefined()

				const results2 = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
					offset: results.data.length - 2,
				})) as FindManyResponseObject
				expect(results2.data.length).toEqual(2)
				expect(results2.data[0].orderId).toBeDefined()
				expect(results2.data[0].shipAddress).toBeDefined()
				expect(results2.data[0].custId).toBeDefined()
				expect(results2.data[0].Customer[0].companyName).toBeDefined()
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
