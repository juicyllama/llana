import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { DataSourceSchema } from './types/datasource.types'
import { EmployeeTestingService } from './testing/employee.testing.service'
import { ShipperTestingService } from './testing/shipper.testing.service'
import { TIMEOUT } from './testing/testing.const'
import { Logger } from './helpers/Logger'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { envValidationSchema } from './config/env.validation'
import { RolePermission } from './types/roles.types'

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

	//TODO expand to test enums, relations, and other fields
	//validate response according to the schema
	describe('Validate response types', () => {

		let result: any = {}
		
		it('Object', async function () {
			result = <any>(
				await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			)
	
			expect(result.body).toBeDefined()
		})	


		it('String', function () {
			expect(result.body.shipName).toBeDefined()
			expect(result.body.shipName).not.toBeNull()
			expect(typeof result.body.shipName).toBe("string")
		})

		it('Number', function () {
			expect(result.body.freight).toBeDefined()
			expect(result.body.freight).not.toBeNull()
			expect(typeof result.body.freight).toBe("number")
		})

		it('Boolean', function () {
			//TODO: Add boolean field to the schema
		})

		it('Date', function () {
			expect(result.body.orderDate).not.toBeNull()
			expect(new Date(result.body.orderDate)).toBeInstanceOf(Date)
		})

		it('Enum', function () {
			//TODO: Add enum field to the schema
		})

	})

	describe('Public Fetch', () => {

		it('Default public fail to fetch', async function () {
			await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.expect(401)
		})

		it('Can fetch with READ permissions', async function () {

			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.READ,
			})

			try{

				await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.expect(200)

			}catch(e){
				logger.error(e)
				throw e
			}finally{
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can fetch with WRITE permissions', async function () {
		
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.WRITE,
			})

			try{
				await request(app.getHttpServer())
				.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
				.expect(200)
			}catch(e){
				logger.error(e)
				throw e
			}finally{
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})
	})

	afterAll(async () => {
		for (let i = 0; i < 10; i++) {
			await salesOrderTestingService.deleteOrder(orders[i][salesOrderSchema.primary_key])
		}
		await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		await employeeTestingService.deleteEmployee(employee[employeeSchema.primary_key])
		await shipperTestingService.deleteShipper(shipper[shipperSchema.primary_key])
		await app.close()
	}, TIMEOUT)
})
