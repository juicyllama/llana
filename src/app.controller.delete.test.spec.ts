import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import * as request from 'supertest'
import { CustomerTestingService } from './testing/customer.testing.service'

import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { DataSourceSchema } from './types/datasource.types'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { envValidationSchema } from './config/env.validation'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('App > Controller > Delete', () => {
	let app: INestApplication

	let authTestingService: AuthTestingService
	let customerTestingService: CustomerTestingService

	let customerSchema: DataSourceSchema

	let customer1: any
	let customer2: any
	let customer3: any

	let jwt: string

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

		customerSchema = await customerTestingService.getSchema()

		customer1 = await customerTestingService.createCustomer({})
		customer2 = await customerTestingService.createCustomer({})
		customer3 = await customerTestingService.createCustomer({})

		jwt = await authTestingService.login()
	})

	describe('Delete', () => {
		it('Delete One', async function () {
			const result = await request(app.getHttpServer())
				.delete(`/Customer/${customer1[customerSchema.primary_key]}`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.deleted).toEqual(1)
		})
		it('Delete Many', async function () {
			customer2.companyName = 'Customer2 Company Name'
			customer3.companyName = 'Customer2 Company Name'

			const result = await request(app.getHttpServer())
				.delete(`/Customer/`)
				.send([
					{
						[customerSchema.primary_key]: customer2[customerSchema.primary_key],
					},
					{
						[customerSchema.primary_key]: customer3[customerSchema.primary_key],
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

	afterAll(async () => {
		await app.close()
	})
})
