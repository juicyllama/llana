import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'
import { AppBootup } from './app.service.bootup'
import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { DataSourceSchema, QueryPerform, DataSourceColumnType, WhereOperator, ColumnExtraNumber } from './types/datasource.types'
import { EmployeeTestingService } from './testing/employee.testing.service'
import { ShipperTestingService } from './testing/shipper.testing.service'
import { TIMEOUT } from './testing/testing.const'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { LLANA_ROLES_TABLE } from './app.constants'
import { AppBootup } from './app.service.bootup'

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
		const logger = new Logger()
		const query = app.get(Query)

		// Clean up existing test data
		logger.log('Cleaning up test database...')
		try {
			await query.perform(QueryPerform.DELETE, {
				schema: {
					table: 'User',
					primary_key: 'id',
					columns: [
						{
							field: 'email',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: true,
							foreign_key: false
						}
					]
				},
				where: [
					{
						column: 'email',
						operator: WhereOperator.like,
						value: '%@test.com'
					}
				]
			})
			logger.log('Test users cleaned up')
		} catch (error) {
			logger.warn('Error cleaning up test users:', error)
		}

		// Bootstrap application and verify table creation
		logger.log('Bootstrapping application...')
		await app.get(AppBootup).onApplicationBootstrap()
		logger.log('Application bootstrap complete')

		// Verify role table exists
		try {
			await query.perform(QueryPerform.FIND_ONE, {
				schema: {
					table: LLANA_ROLES_TABLE,
					primary_key: 'id',
					columns: [
						{
							field: 'id',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: true,
							primary_key: true,
							unique_key: true,
							foreign_key: false,
							auto_increment: true
						}
					]
				}
			})
			logger.log(`${LLANA_ROLES_TABLE} table exists and is accessible`)
		} catch (error) {
			logger.error(`${LLANA_ROLES_TABLE} table not found or error accessing it:`, error)
			throw new Error(`${LLANA_ROLES_TABLE} table was not created during bootstrap`)
		}

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
		let llanaRolesTableSchema: DataSourceSchema
		let query: Query
		let logger: Logger

		beforeAll(async () => {
			logger = new Logger()
			logger.log('Setting up Role-based Column Visibility tests')
			query = app.get<Query>(Query)
			llanaRolesTableSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
						extra: <ColumnExtraNumber>{
							decimal: 0,
						},
					},
					{
						field: 'custom',
						type: DataSourceColumnType.BOOLEAN,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'role',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'records',
						type: DataSourceColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'READ_RESTRICTED', 'WRITE', 'WRITE_RESTRICTED', 'DELETE'],
					},
					{
						field: 'restricted_fields',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
				],
			}
		})

		it('should create role with restricted fields', async () => {
			logger.log('Creating role with restricted fields')
			const role = {
				custom: true,
				table: 'SalesOrder',
				role: 'restricted_viewer',
				records: 'READ_RESTRICTED',
				restricted_fields: 'shipName,freight',
			}

			const result = await query.perform(QueryPerform.CREATE, {
				schema: llanaRolesTableSchema,
				data: role,
			})

			expect(result).toBeDefined()
			expect(result['id']).toBeDefined()
			logger.log('Role created successfully')
		})

		it('should hide restricted fields for single record', async () => {
			const restrictedJwt = await authTestingService.login('restricted_viewer')
			const result = await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.set('Authorization', `Bearer ${restrictedJwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.shipName).toBeUndefined()
			expect(result.body.freight).toBeUndefined()
			expect(result.body.shipCity).toBeDefined()
		})

		it('should hide restricted fields for list response', async () => {
			const restrictedJwt = await authTestingService.login('restricted_viewer')
			const result = await request(app.getHttpServer())
				.get('/SalesOrder')
				.set('Authorization', `Bearer ${restrictedJwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.data[0].shipName).toBeUndefined()
			expect(result.body.data[0].freight).toBeUndefined()
			expect(result.body.data[0].shipCity).toBeDefined()
		})

		afterAll(async () => {
			// Clean up test roles
			await query.perform(QueryPerform.DELETE, {
				schema: llanaRolesTableSchema,
				where: [{
					column: 'role',
					operator: WhereOperator.equals,
					value: 'restricted_viewer'
				}]
			})
		})
	})

	afterAll(async () => {
		await app.close()
	})
