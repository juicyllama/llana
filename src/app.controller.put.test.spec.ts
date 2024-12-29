import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { DataSourceSchema } from './types/datasource.types'
import { SalesOrderTestingService } from './testing/salesorder.testing.service'
import { EmployeeTestingService } from './testing/employee.testing.service'
import { ShipperTestingService } from './testing/shipper.testing.service'
import { UserTestingService } from './testing/user.testing.service'
import { Logger } from './helpers/Logger'
import { TIMEOUT } from './testing/testing.const'

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

describe('App > Controller > Put', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let employeeTestingService: EmployeeTestingService
	let shipperTestingService: ShipperTestingService
	let salesOrderTestingService: SalesOrderTestingService
	let userTestingService: UserTestingService

	let customerSchema: DataSourceSchema
	let employeeSchema: DataSourceSchema
	let shipperSchema: DataSourceSchema
	let orderSchema: DataSourceSchema
	let userSchema: DataSourceSchema

	let customers = []
	let employee: any
	let shipper: any
	let order: any
	let user: any

	let jwt: string
	let userId: any
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
		orderSchema = await salesOrderTestingService.getSchema()
		userSchema = await userTestingService.getSchema()

		jwt = await authTestingService.login()
		userId = await authTestingService.getUserId(jwt)

		user = await userTestingService.createUser({})
		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId: user[userSchema.primary_key] }))
		employee = await employeeTestingService.createEmployee({})
		shipper = await shipperTestingService.createShipper({})
		order = await salesOrderTestingService.createOrder({
			custId: customers[0][customerSchema.primary_key],
			employeeId: employee[employeeSchema.primary_key],
			shipperId: shipper[shipperSchema.primary_key],
		})
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Update', () => {
		it('One', async function () {
			const result = await request(app.getHttpServer())
				.put(`/Customer/${customers[0][customerSchema.primary_key]}`)
				.send({
					companyName: 'Updated Company Name',
					contactName: 'Updated Contact Name',
				})
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key].toString()).toEqual(
				customers[0][customerSchema.primary_key].toString(),
			)
			expect(result.body.companyName).toEqual('Updated Company Name')
			expect(result.body.contactName).toEqual('Updated Contact Name')
			customers[0] = result.body
		})
		it('Many', async function () {
			customers[1].companyName = 'Customer2 Company Name'
			customers[2].companyName = 'Customer2 Company Name'

			const result = await request(app.getHttpServer())
				.put(`/Customer/`)
				.send([
					{
						[customerSchema.primary_key]: customers[1][customerSchema.primary_key],
						companyName: customers[1].companyName,
					},
					{
						[customerSchema.primary_key]: customers[2][customerSchema.primary_key],
						companyName: customers[2].companyName,
					},
				])
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.total).toBeDefined()
			expect(result.body.total).toEqual(2)
			expect(result.body.errored).toBeDefined()
			expect(result.body.errored).toEqual(0)
			expect(result.body.successful).toBeDefined()
			expect(result.body.successful).toEqual(2)
			expect(result.body.data.length).toBeGreaterThan(0)
			expect(result.body.data[0][customerSchema.primary_key].toString()).toEqual(
				customers[1][customerSchema.primary_key].toString(),
			)
			expect(result.body.data[0].companyName).toEqual(customers[1].companyName)
			expect(result.body.data[0].contactName).toEqual(customers[1].contactName)
			expect(result.body.data[1][customerSchema.primary_key].toString()).toEqual(
				customers[2][customerSchema.primary_key].toString(),
			)
			expect(result.body.data[1].companyName).toEqual(customers[2].companyName)
			expect(result.body.data[1].contactName).toEqual(customers[2].contactName)
			customers[1] = result.body.data[0]
			customers[2] = result.body.data[1]
		})

		it('One - Integer', async function () {
			const result = await request(app.getHttpServer())
				.put(`/SalesOrder/${order[orderSchema.primary_key]}`)
				.send({
					freight: 10.01,
				})
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[orderSchema.primary_key].toString()).toEqual(order[orderSchema.primary_key].toString())
			expect(result.body.freight).toEqual(10.01)
			order = result.body
		})

		describe('User', () => {
			it('Did it encrypt the password?', async () => {
				const result = await request(app.getHttpServer())
					.put(`/User/${user[userSchema.primary_key]}`)
					.send({
						password: 'password',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[userSchema.primary_key].toString()).toEqual(user[userSchema.primary_key].toString())
				expect(result.body.password.startsWith('$2')).toBeTruthy()
				user = result.body
			})
		})
	})

	describe('Public Updating', () => {
		it('Default public fail to create', async function () {
			await request(app.getHttpServer())
				.put(`/Customer/${customers[0][customerSchema.primary_key]}`)
				.send({
					companyName: 'Anything here',
				})
				.expect(401)
		})

		it('Cannot update with READ permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.READ,
			})

			try {
				await request(app.getHttpServer())
					.put(`/Customer/${customers[0][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can update with WRITE permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.WRITE,
			})

			try {
				await request(app.getHttpServer())
					.put(`/Customer/${customers[0][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can update with WRITE permissions and allowed fields', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.WRITE,
				allowed_fields: 'companyName',
			})

			try {
				const result = await request(app.getHttpServer())
					.put(`/Customer/${customers[0][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body[customerSchema.primary_key]).toBeUndefined()
				expect(result.body.companyName).toBeDefined()
				expect(result.body.contactName).toBeUndefined()
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
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})
	})

	describe('Role Based Updating', () => {
		it('No table role, updates record', async function () {
			await request(app.getHttpServer())
				.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
				.send({
					companyName: 'Anything here',
				})
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
		})

		it('DELETE table role, updates record', async function () {
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('DELETE table role, own records, fails to update someone elses record', async function () {
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, updates record', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.WRITE,
				own_records: RolePermission.NONE,
			})

			try {
				await request(app.getHttpServer())
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, own records, fails to update someone elses record', async function () {
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, multiple records, one success and one fail', async function () {
			const role = await authTestingService.createRole({
				custom: true,
				table: customerSchema.table,
				identity_column: 'userId',
				role: 'ADMIN',
				records: RolePermission.NONE,
				own_records: RolePermission.WRITE,
			})

			try {
				const result = await request(app.getHttpServer())
					.put(`/Customer/`)
					.send([
						{
							[customerSchema.primary_key]: customers[0][customerSchema.primary_key],
							companyName: 'Anything here',
						},
						{
							[customerSchema.primary_key]: customers[3][customerSchema.primary_key],
							companyName: 'Anything here',
						},
					])
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body.total).toBeDefined()
				expect(result.body.total).toEqual(2)
				expect(result.body.errored).toBeDefined()
				expect(result.body.errored).toEqual(1)
				expect(result.body.successful).toBeDefined()
				expect(result.body.successful).toEqual(1)
				expect(result.body.data.length).toBeGreaterThan(0)
				expect(result.body.data[0][customerSchema.primary_key]).toBeDefined()
				expect(result.body.data[0].companyName).toBeDefined()
				expect(result.body.data[1]).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, updates record', async function () {
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, own records, fails to update someone elses record', async function () {
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
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
				.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
				.send({
					companyName: 'Anything here',
				})
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
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
					.put(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.send({
						companyName: 'Anything here',
					})
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

		it('When allowed_fields are passed, only return these fields (multiple)', async function () {
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
					.put(`/Customer/`)
					.send([
						{
							[customerSchema.primary_key]: customers[0][customerSchema.primary_key],
							companyName: 'Anything here',
						},
						{
							[customerSchema.primary_key]: customers[1][customerSchema.primary_key],
							companyName: 'Anything here',
						},
					])
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)

				expect(result.body).toBeDefined()
				expect(result.body.total).toBeDefined()
				expect(result.body.total).toEqual(2)
				expect(result.body.errored).toBeDefined()
				expect(result.body.errored).toEqual(0)
				expect(result.body.data[0][customerSchema.primary_key]).toBeUndefined()
				expect(result.body.data[0].companyName).toBeDefined()
				expect(result.body.data[0].contactName).toBeDefined()
				expect(result.body.data[0].contactTitle).toBeUndefined()
				expect(result.body.data[0].address).toBeUndefined()
				expect(result.body.data[0].city).toBeUndefined()
				expect(result.body.data[0].region).toBeUndefined()
				expect(result.body.data[0].postalCode).toBeUndefined()
				expect(result.body.data[0].country).toBeUndefined()
				expect(result.body.data[0].phone).toBeUndefined()
				expect(result.body.data[0].fax).toBeUndefined()
				expect(result.body.data[1][customerSchema.primary_key]).toBeUndefined()
				expect(result.body.data[1].companyName).toBeDefined()
				expect(result.body.data[1].contactName).toBeDefined()
				expect(result.body.data[1].contactTitle).toBeUndefined()
				expect(result.body.data[1].address).toBeUndefined()
				expect(result.body.data[1].city).toBeUndefined()
				expect(result.body.data[1].region).toBeUndefined()
				expect(result.body.data[1].postalCode).toBeUndefined()
				expect(result.body.data[1].country).toBeUndefined()
				expect(result.body.data[1].phone).toBeUndefined()
				expect(result.body.data[1].fax).toBeUndefined()
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})
	})

	afterAll(async () => {
		await salesOrderTestingService.deleteOrder(order[orderSchema.primary_key])
		for (let customer of customers) {
			await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		}
		await employeeTestingService.deleteEmployee(employee[employeeSchema.primary_key])
		await shipperTestingService.deleteShipper(shipper[shipperSchema.primary_key])
		await userTestingService.deleteUser(user[userSchema.primary_key])
		await app.close()
	})
})
