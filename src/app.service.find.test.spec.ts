import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from './app.module'
import { FindService } from './app.service.find'
import { DatabaseSchema, WhereOperator } from './types/database.types'
import { Schema } from './helpers/Schema'
import { Logger } from './helpers/Logger'

describe('Find Service', () => {
	let app: TestingModule
	let service: FindService
	let schema: Schema
	let logger: Logger
	let usersTableSchema: DatabaseSchema
	let customerTableSchema: DatabaseSchema
	let salesOrderTableSchema: DatabaseSchema

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		service = app.get<FindService>(FindService)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		usersTableSchema = await schema.getSchema('User')
		customerTableSchema = await schema.getSchema('Customer')
		salesOrderTableSchema = await schema.getSchema('SalesOrder')
	})

	describe('findOne', () => {
		it('Invalid Id', async () => {
			try {
				const results = await service.findOne({
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
				const results = await service.findOne({
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '1' }],
				})
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
				const results = await service.findOne({
					schema: usersTableSchema,
					where: [{ column: 'id', operator: WhereOperator.equals, value: '1' }],
					fields: ['id', 'email'],
				})
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
				const results = await service.findOne({
					schema: usersTableSchema,
					where: [
						{ column: 'id', operator: WhereOperator.equals, value: '1' },
						{ column: 'email', operator: WhereOperator.equals, value: 'test@test.com' },
					],
					fields: ['id', 'email'],
				})
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
				const results = await service.findMany({
					schema: customerTableSchema,
					fields: ['custId', 'companyName'],
				})
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
				const results = await service.findMany({
					schema: customerTableSchema,
					where: [{ column: 'companyName', operator: WhereOperator.search, value: 'NRZBB' }],
				})
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
				const results = await service.findMany({
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
				})
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
				const results = await service.findMany({
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
				})
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
				const results = await service.findMany({
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
					limit: 3,
				})
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
				const results = await service.findMany({
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
				})
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0].orderId).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer[0].companyName).toBeDefined()

				const results2 = await service.findMany({
					schema: salesOrderTableSchema,
					fields: ['orderId', 'shipAddress', 'custId', 'Customer.companyName'],
					where: [{ column: 'custId', operator: WhereOperator.equals, value: '91' }],
					relations: ['Customer'],
					joins: true,
					offset: results.data.length - 2,
				})
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
