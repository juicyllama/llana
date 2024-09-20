import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { DatabaseRelations, DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { FindManyResponseObject, FindOneResponseObject } from '../dtos/response.dto'
import { Logger, logLevel } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'
import { UserTestingService } from '../testing/user.testing.service'
import { CustomerTestingService } from '../testing/customer.testing.service'
import { ShipperTestingService } from '../testing/shipper.testing.service'
import { EmployeeTestingService } from '../testing/employee.testing.service'
import { SalesOrderTestingService } from '../testing/salesorder.testing.service'

describe('Query > Find', () => {
	let app: INestApplication
	let service: Query
	let schema: Schema
	let logger: Logger
	let usersTableSchema: DatabaseSchema
	let userTestingService: UserTestingService
	let customerTableSchema: DatabaseSchema
	let customerTestingService: CustomerTestingService
	let salesOrderTableSchema: DatabaseSchema
	let salesOrderTestingService: SalesOrderTestingService
	let customerRelation: DatabaseRelations
	let shipperTestingService: ShipperTestingService
	let employeeTestingService: EmployeeTestingService

	let user_primary_key: string
	let user: FindOneResponseObject
	let customer_primary_key: string
	let customer: FindOneResponseObject
	let order_primary_key: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [
				CustomerTestingService,
				UserTestingService,
				SalesOrderTestingService,
				ShipperTestingService,
				EmployeeTestingService,
			],
			exports: [
				CustomerTestingService,
				UserTestingService,
				SalesOrderTestingService,
				ShipperTestingService,
				EmployeeTestingService,
			],
		}).compile()

		app = moduleRef.createNestApplication({
			logger: logLevel(),
		})

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		usersTableSchema = await schema.getSchema({ table: 'User' })
		userTestingService = app.get<UserTestingService>(UserTestingService)
		customerTableSchema = await schema.getSchema({ table: 'Customer' })
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		salesOrderTableSchema = await schema.getSchema({ table: 'SalesOrder' })
		salesOrderTestingService = app.get<SalesOrderTestingService>(SalesOrderTestingService)
		shipperTestingService = app.get<ShipperTestingService>(ShipperTestingService)
		employeeTestingService = app.get<EmployeeTestingService>(EmployeeTestingService)

		user_primary_key = usersTableSchema.primary_key
		customer_primary_key = customerTableSchema.primary_key
		order_primary_key = salesOrderTableSchema.primary_key

		customerRelation = {
			table: 'Customer',
			join: {
				table: 'Customer',
				column: customer_primary_key,
				org_table: 'SalesOrder',
				org_column: 'custId',
			},
			schema: customerTableSchema,
		}

		user = (await userTestingService.createUser({})) as FindOneResponseObject
		customer = (await customerTestingService.createCustomer({})) as FindOneResponseObject

		const shipper = await shipperTestingService.getShipper()
		const employee = await employeeTestingService.getEmployee()

		for (let i = 0; i < 10; i++) {
			await salesOrderTestingService.createOrder({
				custId: customer[customer_primary_key],
				employeeId: employee.employeeId,
				shipperId: shipper.shipperId,
			})
		}
	})

	describe('findOne', () => {
		it('By Id', async () => {
			try {
				const result = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{ column: user_primary_key, operator: WhereOperator.equals, value: user[user_primary_key] },
					],
				})) as FindOneResponseObject
				expect(result[user_primary_key]).toEqual(user[user_primary_key])
				expect(result.email).toEqual(user.email)
				expect(result.firstName).toEqual(user.firstName)
				expect(result.lastName).toEqual(user.lastName)
				expect(result.role).toEqual(user.role)
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Fields', async () => {
			try {
				const result = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{ column: user_primary_key, operator: WhereOperator.equals, value: user[user_primary_key] },
					],
					fields: [user_primary_key, 'email'],
				})) as FindOneResponseObject
				expect(result.email).toEqual(user.email)
				expect(result.firstName).toBeUndefined()
				expect(result.lastName).toBeUndefined()
				expect(result.role).toBeUndefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing filters', async () => {
			try {
				const result = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{ column: user_primary_key, operator: WhereOperator.equals, value: user[user_primary_key] },
						{ column: 'email', operator: WhereOperator.equals, value: user.email },
					],
					fields: [user_primary_key, 'email'],
				})) as FindOneResponseObject
				expect(result[user_primary_key]).toEqual(user[user_primary_key])
				expect(result.email).toEqual(user.email)
				expect(result.firstName).toBeUndefined()
				expect(result.lastName).toBeUndefined()
				expect(result.role).toBeUndefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Validate Response Fields', async () => {
			try {
				const result = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{ column: user_primary_key, operator: WhereOperator.equals, value: user[user_primary_key] },
					],
				})) as FindOneResponseObject

				expect(result[user_primary_key]).toEqual(user[user_primary_key])
				expect(result.email).toEqual(user.email)
				expect(result.firstName).toEqual(user.firstName)
				expect(result.lastName).toEqual(user.lastName)
				expect(result.role).toEqual(user.role)
				expect(result.createdAt).toBeDefined()
				expect(new Date(result.createdAt)).toBeInstanceOf(Date)
				expect(result.updatedAt).toBeDefined()
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
					fields: [customer_primary_key, 'companyName'],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0][customer_primary_key]).toBeDefined()
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
					where: [{ column: 'companyName', operator: WhereOperator.search, value: customer.companyName }],
				})) as FindManyResponseObject

				console.log(results)

				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0][customer_primary_key]).toBeDefined()
				expect(results.data[0].companyName).toBe(customer.companyName)
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})

		it('Passing Relations', async () => {
			try {
				const results = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: ['shipAddress', 'custId'],
					where: [
						{ column: 'custId', operator: WhereOperator.equals, value: customer[customer_primary_key] },
					],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
				})) as FindManyResponseObject

				expect(results.data.length).toBeGreaterThan(0)
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
					fields: [order_primary_key, 'shipAddress', 'custId'],
					where: [
						{ column: 'custId', operator: WhereOperator.equals, value: customer[customer_primary_key] },
					],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
					limit: 3,
				})) as FindManyResponseObject
				expect(results.data.length).toEqual(3)
				expect(results.data[0][order_primary_key]).toBeDefined()
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
					fields: [order_primary_key, 'shipAddress', 'custId'],
					where: [
						{ column: 'custId', operator: WhereOperator.equals, value: customer[customer_primary_key] },
					],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
				})) as FindManyResponseObject
				expect(results.data.length).toBeGreaterThan(0)
				expect(results.data[0][order_primary_key]).toBeDefined()
				expect(results.data[0].shipAddress).toBeDefined()
				expect(results.data[0].custId).toBeDefined()
				expect(results.data[0].Customer.companyName).toBeDefined()

				const results2 = (await service.perform(QueryPerform.FIND_MANY, {
					schema: salesOrderTableSchema,
					fields: [order_primary_key, 'shipAddress', 'custId'],
					where: [
						{ column: 'custId', operator: WhereOperator.equals, value: customer[customer_primary_key] },
					],
					relations: [{ ...customerRelation, columns: ['companyName'] }],
					offset: results.data.length - 2,
				})) as FindManyResponseObject
				expect(results2.data.length).toEqual(2)
				expect(results2.data[0][order_primary_key]).toBeDefined()
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
