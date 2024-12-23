import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { DataSourceSchema } from './types/datasource.types'
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

describe('App > Controller > Delete', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService

	let customerSchema: DataSourceSchema

	let customers = []

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
			providers: [AuthTestingService, CustomerTestingService],
			exports: [AuthTestingService, CustomerTestingService],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()

		authTestingService = app.get<AuthTestingService>(AuthTestingService)
		customerTestingService = app.get<CustomerTestingService>(CustomerTestingService)


		jwt = await authTestingService.login()
		userId = await authTestingService.getUserId(jwt)

		customerSchema = await customerTestingService.getSchema()

		customers.push(await customerTestingService.createCustomer({userId}))
		customers.push(await customerTestingService.createCustomer({userId}))
		customers.push(await customerTestingService.createCustomer({userId}))
		customers.push(await customerTestingService.createCustomer({userId}))
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
	
				try{
	
					await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.expect(401)
	
				}catch(e){
					logger.error(e)
					throw e
				}finally{
					await authTestingService.deletePublicTablesRecord(public_table_record)
				}
			})
	
			it('Cannot delete with WRITE permissions', async function () {
			
				const public_table_record = await authTestingService.createPublicTablesRecord({
					table: customerSchema.table,
					access_level: RolePermission.WRITE,
				})
	
				try{
					await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
					.expect(401)
				}catch(e){
					logger.error(e)
					throw e
				}finally{
					await authTestingService.deletePublicTablesRecord(public_table_record)
				}
			})

			it('Can delete with DELETE permissions', async function () {
			
				const public_table_record = await authTestingService.createPublicTablesRecord({
					table: customerSchema.table,
					access_level: RolePermission.DELETE,
				})
	
				try{
					await request(app.getHttpServer())
					.delete(`/Customer/${customers[3][customerSchema.primary_key]}`)
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
		for (let customer of customers) {
			await customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		}
		await app.close()
	})
})
