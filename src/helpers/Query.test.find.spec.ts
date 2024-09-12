import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { DatabaseRelations, DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
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
	let customerRelation: DatabaseRelations

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

		customerRelation = {
			table: 'Customer',
			join: {
				table: 'Customer',
				column: 'custId',
				org_table: 'SalesOrder',
				org_column: 'custId',
			},
			schema: customerTableSchema,
		}
	})

	describe('findOne', () => {
		it('Invalid Id', async () => {
			try {
				const results = await service.perform(QueryPerform.FIND, {
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '9999' }],
				})
				expect(results).toBe(null)
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

		it('Validate Response Fields', async () => {
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
				expect(results.createdAt).toBeDefined()
				expect(new Date(results.createdAt)).toBeInstanceOf(Date)
				expect(results.updatedAt).toBeDefined()
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
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer.companyName).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Limit', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
					limit: 3,
				})) as FindManyResponseObject
				expect(results.data.length).toEqual(3)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer.companyName).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Offset', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer.companyName).toBeDefined()

				const results2 = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
					offset: results.data.length - 2,
				})) as FindManyResponseObject
				expect(results2.data.length).toEqual(2)
				expect(results2.data[0].orderId).toBeDefined()
				expect(results2.data[0].shipAddress).toBeDefined()
				expect(results2.data[0].custId).toBeDefined()
				expect(results2.data[0].Customer.companyName).toBeDefined()
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
