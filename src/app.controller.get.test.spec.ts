import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { DataSourceSchema, QueryPerform, DataSourceColumnType, WhereOperator } from './types/datasource.types'
import { EmployeeTestingService } from './testing/employee.testing.service'
import { ShipperTestingService } from './testing/shipper.testing.service'
import { TIMEOUT } from './testing/testing.const'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { envValidationSchema } from './config/env.validation'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('App > Controller > Get', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let employeeTestingService: EmployeeTestingService
	let shipperTestingService: ShipperTestingService

	let salesOrderTestingService: SalesOrderTestingService

	let customerSchema: DataSourceSchema
	let employeeSchema: DataSourceSchema
	let shipperSchema: DataSourceSchema
	let salesOrderSchema: DataSourceSchema

	let customer: any
	let employee: any
	let shipper: any
	let orders = []

	let jwt: string
	let logger = new Logger()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: configs,
					validationSchema: envValidationSchema,
					isGlobal: true,
				}),
				JwtModule.registerAsync({
					imports: [ConfigModule],
					useFactory: async (configService: ConfigService) => ({
						secret: configService.get('jwt.secret'),
						signOptions: configService.get('jwt.signOptions'),
					}),
					inject: [ConfigService],
				}),
				AppModule,
			],
			providers: [
				AuthTestingService,
				CustomerTestingService,
				EmployeeTestingService,
				ShipperTestingService,
				SalesOrderTestingService,
			],
			exports: [
				AuthTestingService,
				CustomerTestingService,
				EmployeeTestingService,
				ShipperTestingService,
				SalesOrderTestingService,
			],
		}).compile()
		app = moduleRef.createNestApplication()
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		employeeTestingService = app.get<EmployeeTestingService>(EmployeeTestingService)
		shipperTestingService = app.get<ShipperTestingService>(ShipperTestingService)

		salesOrderTestingService = app.get<SalesOrderTestingService>(SalesOrderTestingService)

		customerSchema = await customerTestingService.getSchema()
		employeeSchema = await employeeTestingService.getSchema()
		shipperSchema = await shipperTestingService.getSchema()
		salesOrderSchema = await salesOrderTestingService.getSchema()

		customer = await customerTestingService.createCustomer({})
		employee = await employeeTestingService.createEmployee({})

		shipper = await shipperTestingService.createShipper({})

		for (let i = 0; i < 10; i++) {
			orders.push(
				await salesOrderTestingService.createOrder({
					orderId: i + 1000,
					custId: customer[customerSchema.primary_key],
					employeeId: employee[employeeSchema.primary_key],
					shipperId: shipper[shipperSchema.primary_key],
				}),
			)
		}

		jwt = await authTestingService.login()
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Get', () => {
		it('One', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.employeeId).toBeDefined()
			expect(result.body.shipperId).toBeDefined()
			expect(result.body.shipName).toBeDefined()
		})

		it('One - With Relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?relations=Customer`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.custId).toBeDefined()
			expect(result.body.employeeId).toBeDefined()
			expect(result.body.shipperId).toBeDefined()
			expect(result.body.shipName).toBeDefined()
			expect(result.body.Customer[0]).toBeDefined()
			expect(result.body.Customer[0].contactName).toBeDefined()
		})

		it('One - With Fields', async function () {
			const result = <any>(
				await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?fields=shipName`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			)

			expect(result.body).toBeDefined()
			expect(result.body.shipName).toBeDefined()
			expect(result.body.freight).toBeUndefined()
			expect(result.body.shipCity).toBeUndefined()
			expect(result.body.orderDate).toBeUndefined()
		})

		it('One - With Filters', async function () {
			const result = await request(app.getHttpServer())
				.get(
					`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?fields=shipName&shipName=${orders[0].shipName}`,
				)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.shipName).toBe(orders[0].shipName)
			expect(result.body.freight).toBeUndefined()
			expect(result.body.shipCity).toBeUndefined()
			expect(result.body.orderDate).toBeUndefined()
		})
	})

	describe('List', () => {
		it('All', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.data[0].shipName).toBeDefined()
		})

		it('All - With Relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/?relations=Customer`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][salesOrderSchema.primary_key]).toBeDefined()
			expect(result.body.data[0].shipName).toBeDefined()
			expect(result.body.data[0].Customer[0]).toBeDefined()
			expect(result.body.data[0].Customer[0].contactName).toBeDefined()
		})

		it('All - With Fields', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/?fields=shipName`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0].shipName).toBeDefined()
			expect(result.body.data[0].freight).toBeUndefined()
			expect(result.body.data[0].shipCity).toBeUndefined()
		})

		it('All - With Filters', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/?fields=shipName&shipName=${orders[0].shipName}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toBeGreaterThan(0)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0].shipName).toBeDefined()
			expect(result.body.data[0].freight).toBeUndefined()
			expect(result.body.data[0].shipCity).toBeUndefined()
		})

		it('All - With Limit', async function () {
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/?limit=3`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.limit).toBeDefined()
			expect(result.body.limit).toEqual(3)
			expect(result.body.offset).toEqual(0)
			expect(result.body.total).toBeGreaterThan(3)
			expect(result.body.data.length).toEqual(3)
		})

		it('All - With Offset', async function () {
			const results = await request(app.getHttpServer())
				.get(`/SalesOrder/`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(results.body.data.length).toBeGreaterThan(0)

			const results2 = await request(app.getHttpServer())
				.get(`/SalesOrder/?offset=${results.body.total - 2}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(results2.body.data.length).toEqual(2)
		})
	})

	describe('Role-based Column Visibility', () => {
		let query: Query
		let llanaRolesTableSchema: DataSourceSchema

		beforeAll(async () => {
			query = app.get<Query>(Query)
			llanaRolesTableSchema = {
				table: 'llana_roles',
				primary_key: 'id',
				columns: [
					{ field: 'id', type: DataSourceColumnType.NUMBER, nullable: false, required: true, primary_key: true, unique_key: true, foreign_key: false },
					{ field: 'role', type: DataSourceColumnType.STRING, nullable: false, required: true, primary_key: false, unique_key: false, foreign_key: false },
					{ field: 'records', type: DataSourceColumnType.STRING, nullable: false, required: true, primary_key: false, unique_key: false, foreign_key: false },
					{ field: 'restricted_fields', type: DataSourceColumnType.STRING, nullable: false, required: true, primary_key: false, unique_key: false, foreign_key: false },
					{ field: 'custom', type: DataSourceColumnType.BOOLEAN, nullable: false, required: true, primary_key: false, unique_key: false, foreign_key: false }
				]
			}
		})

		it('should hide restricted fields for user role in single record', async function () {
			// Create role with restricted fields
			const role = await query.perform(QueryPerform.CREATE, {
				schema: llanaRolesTableSchema,
				data: {
					custom: true,
					role: 'RESTRICTED_USER',
					records: 'READ',
					restricted_fields: JSON.stringify(['freight', 'shipCity'])
				}
			})

			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body.freight).toBeUndefined()
			expect(result.body.shipCity).toBeUndefined()
			expect(result.body.shipName).toBeDefined()
		})

		it('should hide restricted fields for user role in list', async function () {
			const result = await request(app.getHttpServer())
				.get('/SalesOrder/')
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body.data[0].freight).toBeUndefined()
			expect(result.body.data[0].shipCity).toBeUndefined()
			expect(result.body.data[0].shipName).toBeDefined()
		})

		it('should show all fields for admin role in single record', async function () {
			// Create admin role without restrictions
			const role = await query.perform(QueryPerform.CREATE, {
				schema: llanaRolesTableSchema,
				data: {
					custom: true,
					role: 'ADMIN',
					records: 'READ',
					restricted_fields: '[]'
				}
			})

			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body.freight).toBeDefined()
			expect(result.body.shipCity).toBeDefined()
			expect(result.body.shipName).toBeDefined()
		})

		it('should show all fields for admin role in list', async function () {
			const result = await request(app.getHttpServer())
				.get('/SalesOrder/')
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body.data[0].freight).toBeDefined()
			expect(result.body.data[0].shipCity).toBeDefined()
			expect(result.body.data[0].shipName).toBeDefined()
		})

		afterAll(async () => {
			// Clean up test roles
			await query.perform(QueryPerform.DELETE, {
				schema: llanaRolesTableSchema,
				where: [
					{ column: 'role', operator: WhereOperator.in, value: ['RESTRICTED_USER', 'ADMIN'] }
				]
			})
		})
	}) // Close List describe block

	afterAll(async () => {
		await app.close()
	})
}) // Close main describe block for 'App > Controller > Get'
