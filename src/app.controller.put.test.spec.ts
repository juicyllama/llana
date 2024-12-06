import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
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
import { before } from 'node:test'
import { TIMEOUT } from './testing/testing.const'

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

	let customer1: any
	let customer2: any
	let customer3: any
	let employee: any
	let shipper: any
	let order: any
	let user: any

	let jwt: string
	let logger = new Logger()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
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

		customer1 = await customerTestingService.createCustomer({})
		customer2 = await customerTestingService.createCustomer({})
		customer3 = await customerTestingService.createCustomer({})
		employee = await employeeTestingService.createEmployee({})
		shipper = await shipperTestingService.createShipper({})
		order = await salesOrderTestingService.createOrder({
			custId: customer1[customerSchema.primary_key],
			employeeId: employee[employeeSchema.primary_key],
			shipperId: shipper[shipperSchema.primary_key],
		})
		user = await userTestingService.createUser({})

		jwt = await authTestingService.login()
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Update', () => {
		it('One', async function () {
			const result = await request(app.getHttpServer())
				.put(`/Customer/${customer1[customerSchema.primary_key]}`)
				.send({
					companyName: 'Updated Company Name',
					contactName: 'Updated Contact Name',
				})
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body[customerSchema.primary_key].toString()).toEqual(
				customer1[customerSchema.primary_key].toString(),
			)
			expect(result.body.companyName).toEqual('Updated Company Name')
			expect(result.body.contactName).toEqual('Updated Contact Name')
			customer1 = result.body
		})
		it('Many', async function () {
			customer2.companyName = 'Customer2 Company Name'
			customer3.companyName = 'Customer2 Company Name'

			const result = await request(app.getHttpServer())
				.put(`/Customer/`)
				.send([
					{
						[customerSchema.primary_key]: customer2[customerSchema.primary_key],
						companyName: customer2.companyName,
					},
					{
						[customerSchema.primary_key]: customer3[customerSchema.primary_key],
						companyName: customer3.companyName,
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
				customer2[customerSchema.primary_key].toString(),
			)
			expect(result.body.data[0].companyName).toEqual(customer2.companyName)
			expect(result.body.data[0].contactName).toEqual(customer2.contactName)
			expect(result.body.data[1][customerSchema.primary_key].toString()).toEqual(
				customer3[customerSchema.primary_key].toString(),
			)
			expect(result.body.data[1].companyName).toEqual(customer3.companyName)
			expect(result.body.data[1].contactName).toEqual(customer3.contactName)
			customer2 = result.body.data[0]
			customer3 = result.body.data[1]
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

	afterAll(async () => {
		await salesOrderTestingService.deleteOrder(order[orderSchema.primary_key])
		await customerTestingService.deleteCustomer(customer1[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer2[customerSchema.primary_key])
		await customerTestingService.deleteCustomer(customer3[customerSchema.primary_key])
		await employeeTestingService.deleteEmployee(employee[employeeSchema.primary_key])
		await shipperTestingService.deleteShipper(shipper[shipperSchema.primary_key])
		await userTestingService.deleteUser(user[userSchema.primary_key])
		await app.close()
	})
})
