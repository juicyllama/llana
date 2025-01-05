import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AppModule } from '../app.module'

describe('GraphQL', () => {
	let app: INestApplication

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	describe('Customer', () => {
		it('should get a customer by id', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						query {
							getCustomer(id: "1") {
								id
								companyName
								contactName
								contactTitle
								address
								city
								region
								postalCode
								country
								phone
								fax
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.getCustomer).toBeDefined()
		})

		it('should create a customer', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						mutation {
							createCustomer(input: {
								companyName: "Test Company"
								contactName: "Test Contact"
								contactTitle: "Test Title"
								address: "Test Address"
								city: "Test City"
								region: "Test Region"
								postalCode: "Test PostalCode"
								country: "Test Country"
								phone: "Test Phone"
								fax: "Test Fax"
							}) {
								id
								companyName
								contactName
								contactTitle
								address
								city
								region
								postalCode
								country
								phone
								fax
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.createCustomer).toBeDefined()
		})
	})

	describe('Employee', () => {
		it('should get an employee by id', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						query {
							getEmployee(id: "1") {
								id
								lastName
								firstName
								title
								titleOfCourtesy
								birthDate
								hireDate
								address
								city
								region
								postalCode
								country
								homePhone
								extension
								notes
								reportsTo
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.getEmployee).toBeDefined()
		})

		it('should create an employee', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						mutation {
							createEmployee(input: {
								lastName: "Test LastName"
								firstName: "Test FirstName"
								title: "Test Title"
								titleOfCourtesy: "Test Courtesy"
								birthDate: "2000-01-01"
								hireDate: "2020-01-01"
								address: "Test Address"
								city: "Test City"
								region: "Test Region"
								postalCode: "Test PostalCode"
								country: "Test Country"
								homePhone: "Test Phone"
								extension: "Test Extension"
								notes: "Test Notes"
								reportsTo: "1"
							}) {
								id
								lastName
								firstName
								title
								titleOfCourtesy
								birthDate
								hireDate
								address
								city
								region
								postalCode
								country
								homePhone
								extension
								notes
								reportsTo
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.createEmployee).toBeDefined()
		})
	})

	describe('Shipper', () => {
		it('should get a shipper by id', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						query {
							getShipper(id: "1") {
								id
								companyName
								phone
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.getShipper).toBeDefined()
		})

		it('should create a shipper', async () => {
			const response = await request(app.getHttpServer())
				.post('/graphql')
				.send({
					query: `
						mutation {
							createShipper(input: {
								companyName: "Test Company"
								phone: "Test Phone"
							}) {
								id
								companyName
								phone
							}
						}
					`,
				})
				.expect(200)

			expect(response.body.data.createShipper).toBeDefined()
		})
	})
})
