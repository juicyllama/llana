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
import { UserTestingService } from './testing/user.testing.service'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('App > Controller > Get', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let employeeTestingService: EmployeeTestingService
	let shipperTestingService: ShipperTestingService
	let userTestingService: UserTestingService

	let salesOrderTestingService: SalesOrderTestingService

	let customerSchema: DataSourceSchema
	let employeeSchema: DataSourceSchema
	let shipperSchema: DataSourceSchema
	let salesOrderSchema: DataSourceSchema
	let userSchema: DataSourceSchema

	let customer: any
	let employee: any
	let shipper: any
	let orders = []

	let jwt: string
	let userId: any
	let user: any
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
				UserTestingService,
			],
			exports: [
				AuthTestingService,
				CustomerTestingService,
				EmployeeTestingService,
				ShipperTestingService,
				SalesOrderTestingService,
				UserTestingService,
			],
		}).compile()
		app = moduleRef.createNestApplication()
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		employeeTestingService = app.get<EmployeeTestingService>(EmployeeTestingService)
		shipperTestingService = app.get<ShipperTestingService>(ShipperTestingService)
		salesOrderTestingService = app.get<SalesOrderTestingService>(SalesOrderTestingService)
		userTestingService = app.get<UserTestingService>(UserTestingService)

		customerSchema = await customerTestingService.getSchema()
		employeeSchema = await employeeTestingService.getSchema()
		shipperSchema = await shipperTestingService.getSchema()
		salesOrderSchema = await salesOrderTestingService.getSchema()
		userSchema = await userTestingService.getSchema()

		jwt = await authTestingService.login()
		userId = await authTestingService.getUserId(jwt)

		user = await userTestingService.mockUser()

		const result = await request(app.getHttpServer())
			.post(`/User/`)
			.send(user)
			.set('Authorization', `Bearer ${jwt}`)
			.expect(201)

		user = result.body
		customer = await customerTestingService.createCustomer({ userId: user[userSchema.primary_key] })
		employee = await employeeTestingService.createEmployee({})

		shipper = await shipperTestingService.createShipper({})

		for (let i = 0; i < 10; i++) {
			orders.push(
				await salesOrderTestingService.createOrder({
					custId: customer[customerSchema.primary_key],
					employeeId: employee[employeeSchema.primary_key],
					shipperId: shipper[shipperSchema.primary_key],
				}),
			)
		}
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
			const result = await request(app.getHttpServer()).get(`/SalesOrder/`).set('Authorization', `Bearer ${jwt}`)
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
			expect(typeof result.body.shipName).toBe('string')
		})

		it('Number', function () {
			expect(result.body.freight).toBeDefined()
			expect(result.body.freight).not.toBeNull()
			expect(typeof result.body.freight).toBe('number')
		})

		it('Boolean', function () {
			//TODO: Add boolean field to the schema
		})

		it('Date', function () {

			console.log(result.body)

			expect(result.body.orderDate).not.toBeNull()
			expect(new Date(result.body.orderDate)).toBeInstanceOf(Date)
			expect(result.body.orderDate).toBeTruthy()
			expect(result.body.deletedAt).toBeFalsy()
		})

		it('Enum', function () {
			//TODO: Add enum field to the schema
		})
	})

	describe('Public Fetch', () => {
		it('Default public fail to fetch', async function () {
			await request(app.getHttpServer()).get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`).expect(401)
		})

		it('Can fetch with READ permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.READ,
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
				expect(result.body.custId).toBeDefined()
				expect(result.body.employeeId).toBeDefined()
				expect(result.body.shipperId).toBeDefined()
				expect(result.body.shipName).toBeDefined()
				expect(result.body.freight).toBeDefined()
				expect(result.body.orderDate).toBeDefined()
				expect(result.body.shipCity).toBeDefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can fetch with READ permissions and allowed fields', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.READ,
				allowed_fields: 'freight,orderDate',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[salesOrderSchema.primary_key]).toBeUndefined()
				expect(result.body.custId).toBeUndefined()
				expect(result.body.employeeId).toBeUndefined()
				expect(result.body.shipperId).toBeUndefined()
				expect(result.body.shipName).toBeUndefined()
				expect(result.body.freight).toBeDefined()
				expect(result.body.orderDate).toBeDefined()
				expect(result.body.shipCity).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can fetch with WRITE permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.WRITE,
			})

			try {
				await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can fetch with READ permissions and allowed fields, check relation permissions', async function () {
			const public_table_customers = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.READ,
				allowed_fields: 'companyName',
			})

			const public_table_sales = await authTestingService.createPublicTablesRecord({
				table: salesOrderSchema.table,
				access_level: RolePermission.READ,
				allowed_fields: salesOrderSchema.primary_key + ',custId,freight,orderDate',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?relations=Customer`)
					.expect(200)
				expect(result.body).toBeDefined()
				expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
				expect(result.body.custId).toBeDefined()
				expect(result.body.employeeId).toBeUndefined()
				expect(result.body.shipperId).toBeUndefined()
				expect(result.body.shipName).toBeUndefined()
				expect(result.body.freight).toBeDefined()
				expect(result.body.orderDate).toBeDefined()
				expect(result.body.shipCity).toBeUndefined()
				expect(result.body.Customer[0]).toBeDefined()
				expect(result.body.Customer[0][customerSchema.primary_key]).toBeUndefined()
				expect(result.body.Customer[0].companyName).toBeDefined()
				expect(result.body.Customer[0].contactName).toBeUndefined()
				expect(result.body.Customer[0].contactTitle).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_customers)
				await authTestingService.deletePublicTablesRecord(public_table_sales)
			}
		})
	})

	describe('Role Based Fetching', () => {
		it('No table role, gets record', async function () {
			await request(app.getHttpServer())
				.get(`/Customer/${customer[customerSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
		})

		it('DELETE table role, get record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.DELETE,
				own_records: RolePermission.DELETE,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('DELETE table role, own records, fails to get someone elses record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.NONE,
				own_records: RolePermission.DELETE,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(204)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, get record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, own records, fails to get someone elses record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.NONE,
				own_records: RolePermission.WRITE,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(204)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, gets record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.READ,
				own_records: RolePermission.READ,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, own records, fails to get someone elses record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.NONE,
				own_records: RolePermission.READ,
			})

			try {
				await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(204)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})
	})

	describe('Allowed Fields Results', () => {
		it('As standard, all fields returned', async function () {
			const result = await request(app.getHttpServer())
				.get(`/Customer/${customer[customerSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key]).toBeDefined()
			expect(result.body.companyName).toBeDefined()
			expect(result.body.contactName).toBeDefined()
			expect(result.body.contactTitle).toBeDefined()
			expect(result.body.address).toBeDefined()
			expect(result.body.city).toBeDefined()
			expect(result.body.region).toBeDefined()
			expect(result.body.postalCode).toBeDefined()
			expect(result.body.country).toBeDefined()
			expect(result.body.phone).toBeDefined()
			expect(result.body.fax).toBeDefined()
		})

		it('When allowed_fields are passed, only return these fields', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: 'companyName,contactName',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[customerSchema.primary_key]).toBeUndefined()
				expect(result.body.companyName).toBeDefined()
				expect(result.body.contactName).toBeDefined()
				expect(result.body.contactTitle).toBeUndefined()
				expect(result.body.address).toBeUndefined()
				expect(result.body.city).toBeUndefined()
				expect(result.body.region).toBeUndefined()
				expect(result.body.postalCode).toBeUndefined()
				expect(result.body.country).toBeUndefined()
				expect(result.body.phone).toBeUndefined()
				expect(result.body.fax).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('When allowed_fields are passed, only return these fields, even when there is a public_table view', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.WRITE,
				allowed_fields: 'companyName',
			})

			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: 'companyName,contactName',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[customerSchema.primary_key]).toBeUndefined()
				expect(result.body.companyName).toBeDefined()
				expect(result.body.contactName).toBeDefined()
				expect(result.body.contactTitle).toBeUndefined()
				expect(result.body.address).toBeUndefined()
				expect(result.body.city).toBeUndefined()
				expect(result.body.region).toBeUndefined()
				expect(result.body.postalCode).toBeUndefined()
				expect(result.body.country).toBeUndefined()
				expect(result.body.phone).toBeUndefined()
				expect(result.body.fax).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('When allowed_fields are passed, only return these fields even with fields passed', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: 'companyName,contactName',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(
						`/Customer/${customer[customerSchema.primary_key]}?fields=companyName,contactName,contactTitle`,
					)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[customerSchema.primary_key]).toBeUndefined()
				expect(result.body.companyName).toBeDefined()
				expect(result.body.contactName).toBeDefined()
				expect(result.body.contactTitle).toBeUndefined()
				expect(result.body.address).toBeUndefined()
				expect(result.body.city).toBeUndefined()
				expect(result.body.region).toBeUndefined()
				expect(result.body.postalCode).toBeUndefined()
				expect(result.body.country).toBeUndefined()
				expect(result.body.phone).toBeUndefined()
				expect(result.body.fax).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('As standard, all fields returned, with relations', async function () {
			const result = await request(app.getHttpServer())
				.get(`/Customer/${customer[customerSchema.primary_key]}?relations=User`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key]).toBeDefined()
			expect(result.body.companyName).toBeDefined()
			expect(result.body.contactName).toBeDefined()
			expect(result.body.contactTitle).toBeDefined()
			expect(result.body.address).toBeDefined()
			expect(result.body.city).toBeDefined()
			expect(result.body.region).toBeDefined()
			expect(result.body.postalCode).toBeDefined()
			expect(result.body.country).toBeDefined()
			expect(result.body.phone).toBeDefined()
			expect(result.body.fax).toBeDefined()
			expect(result.body.User[0]).toBeDefined()
			expect(result.body.User[0][userSchema.primary_key]).toBeDefined()
			expect(result.body.User[0].email).toBeDefined()
			expect(result.body.User[0].password).toBeDefined()
			expect(result.body.User[0].role).toBeDefined()
			expect(result.body.User[0].firstName).toBeDefined()
			expect(result.body.User[0].lastName).toBeDefined()
		})

		it('When allowed_fields are passed, only return these fields, with relations', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: 'companyName,contactName,userId,User.email',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(`/Customer/${customer[customerSchema.primary_key]}?relations=User`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[customerSchema.primary_key]).toBeUndefined()
				expect(result.body.companyName).toBeDefined()
				expect(result.body.contactName).toBeDefined()
				expect(result.body.contactTitle).toBeUndefined()
				expect(result.body.address).toBeUndefined()
				expect(result.body.city).toBeUndefined()
				expect(result.body.region).toBeUndefined()
				expect(result.body.postalCode).toBeUndefined()
				expect(result.body.country).toBeUndefined()
				expect(result.body.phone).toBeUndefined()
				expect(result.body.fax).toBeUndefined()
				expect(result.body.User[0]).toBeDefined()
				expect(result.body.User[0][userSchema.primary_key]).toBeUndefined()
				expect(result.body.User[0].email).toBeDefined()
				expect(result.body.User[0].password).toBeUndefined()
				expect(result.body.User[0].role).toBeUndefined()
				expect(result.body.User[0].firstName).toBeUndefined()
				expect(result.body.User[0].lastName).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('When allowed_fields are passed, only return these fields even with fields passe, with relations', async function () {
			
			const role_salesOrder = await authTestingService.createRole({
				custom: true,
				table: salesOrderSchema.table,
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: salesOrderSchema.primary_key+',custId,shipName',
			})
			
			const role_customer = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.WRITE,
				allowed_fields: 'companyName,contactName',
			})

			try {
				const result = await request(app.getHttpServer())
					.get(
						`/SalesOrder/${orders[0][salesOrderSchema.primary_key]}?relations=Customer`,
					)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[salesOrderSchema.primary_key]).toBeDefined()
				expect(result.body.custId).toBeDefined()
				expect(result.body.shipName).toBeDefined()
				expect(result.body.freight).toBeUndefined()
				expect(result.body.shipCity).toBeUndefined()
				expect(result.body.orderDate).toBeUndefined()
				expect(result.body.Customer[0]).toBeDefined()
				expect(result.body.Customer[0].companyName).toBeDefined()
				expect(result.body.Customer[0].contactName).toBeDefined()
				expect(result.body.Customer[0].contactTitle).toBeUndefined()
				expect(result.body.Customer[0].address).toBeUndefined()
				expect(result.body.Customer[0].city).toBeUndefined()
				expect(result.body.Customer[0].region).toBeUndefined()
				expect(result.body.Customer[0].postalCode).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role_salesOrder)
				await authTestingService.deleteRole(role_customer)
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
		await userTestingService.deleteUser(user[userSchema.primary_key])
		await app.close()
	}, TIMEOUT)
})
