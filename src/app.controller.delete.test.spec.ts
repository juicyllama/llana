import { INestApplication } from '@nestjs/common'
import { ConfigFactory, ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { Logger } from './helpers/Logger'
import { AuthTestingService } from './testing/auth.testing.service'
import { DataSourceSchema } from './types/datasource.types'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import { envValidationSchema } from './config/env.validation'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { UserTestingService } from './testing/user.testing.service'
import { RolePermission } from './types/roles.types'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('App > Controller > Delete', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService
	let userTestingService: UserTestingService

	let customerSchema: DataSourceSchema
	let userSchema: DataSourceSchema

	let customers = []
	let own_customer: any
	let other_customer: any

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
			providers: [AuthTestingService, CustomerTestingService, UserTestingService],
			exports: [AuthTestingService, CustomerTestingService, UserTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()

		// Expose the app object globally for debugging
		;(global as any).app = app

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)
		userTestingService = app.get<UserTestingService>(UserTestingService)

		jwt = await authTestingService.login()
		userId = await authTestingService.getUserId(jwt)
		user = await userTestingService.mockUser({ email: 'app.controller.delete.test.spec3@gmail.com' })

		const result = await request(app.getHttpServer())
			.post(`/User/`)
			.send(user)
			.set('Authorization', `Bearer ${jwt}`)

		if (result.status !== 201) {
			throw new Error('Failed to create user: ' + result.text)
		}

		user = result.body

		customerSchema = await customerTestingService.getSchema()
		userSchema = await userTestingService.getSchema()

		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId }))
		customers.push(await customerTestingService.createCustomer({ userId }))
	})

	describe('Delete', () => {
		it('Delete One', async function () {
			const result = await request(app.getHttpServer())
				.delete(`/Customer/${customers[0][customerSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.deleted).toEqual(1)
		})
		it('Delete Many', async function () {
			customers[1].companyName = 'Customer2 Company Name'
			customers[2].companyName = 'Customer2 Company Name'

			const result = await request(app.getHttpServer())
				.delete(`/Customer/`)
				.send([
					{
						[customerSchema.primary_key]: customers[1][customerSchema.primary_key],
					},
					{
						[customerSchema.primary_key]: customers[2][customerSchema.primary_key],
					},
				])
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.deleted).toEqual(2)
			expect(result.body.errored).toEqual(0)
			expect(result.body.total).toEqual(2)
		})
	})

	describe('Public Deletion', () => {
		it('Default public fail to delete', async function () {
			await request(app.getHttpServer())
				.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
				.expect(401)
		})

		it('Cannot delete with READ permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.READ,
			})

			try {
				await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Cannot delete with WRITE permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.WRITE,
			})

			try {
				await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})

		it('Can delete with DELETE permissions', async function () {
			const public_table_record = await authTestingService.createPublicTablesRecord({
				table: customerSchema.table,
				access_level: RolePermission.DELETE,
			})

			try {
				await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deletePublicTablesRecord(public_table_record)
			}
		})
	})

	describe('Role Based Creation', () => {
		beforeEach(async () => {
			other_customer = await request(app.getHttpServer())
				.post(`/Customer/`)
				.send(customerTestingService.mockCustomer(user[userSchema.primary_key]))
				.set('Authorization', `Bearer ${jwt}`)
				.expect(201)
			customers.push(other_customer.body)

			own_customer = await request(app.getHttpServer())
				.post(`/Customer/`)
				.send(customerTestingService.mockCustomer(userId))
				.set('Authorization', `Bearer ${jwt}`)
				.expect(201)
			customers.push(own_customer.body)
		})

		it('No table role, delete record', async function () {
			await request(app.getHttpServer())
				.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			customers.pop()
		})

		it('DELETE table role, delete record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('DELETE table role, own records, delete own record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(200)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('DELETE table role, own records, fails to delete someone elses record', async function () {
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
					.delete(`/Customer/${other_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, cannot delete record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, own records, cannot delete own record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('WRITE table role, own records, fails to delete someone elses record', async function () {
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
					.delete(`/Customer/${other_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, cannot delete record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, own records, cannot delete own record', async function () {
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
					.delete(`/Customer/${own_customer.body[customerSchema.primary_key]}`)
					.set('Authorization', `Bearer ${jwt}`)
					.expect(401)
			} catch (e) {
				logger.error(e)
				throw e
			} finally {
				await authTestingService.deleteRole(role)
			}
		})

		it('READ table role, own records, fails to delete someone elses record', async function () {
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
					.delete(`/Customer/${other_customer.body[customerSchema.primary_key]}`)
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

	afterAll(async () => {
		for (let customer of customers) {
			await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		}
		await userTestingService.deleteUser(user[userSchema.primary_key])
		await app.close()
	})
})
