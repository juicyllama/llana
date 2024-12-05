import { Injectable } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

const table = 'Employee'

@Injectable()
export class EmployeeTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockEmployee(): any {
		return {
			employeeId: faker.number.int({
				min: 1000,
				max: 9999,
			}),
			email: faker.internet.email(),
			notes: null,
			phone: faker.phone.number(),
			photo: null,
			title: faker.person.jobTitle().slice(0, 10),
			mobile: null,
			lastName: faker.person.lastName(),
			firstName: faker.person.firstName(),
			hireDate: faker.date.past(),
			address: faker.location.streetAddress(),
			city: faker.location.city().substring(0, 10),
			region: faker.location.state(),
			postalCode: faker.location.zipCode(),
			country: faker.location.countryCode(),
			extension: null,
			birthDate: faker.date.past(),
			photoPath: null,
			titleOfCourtesy: faker.person.prefix(),
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createEmployee(employee: any): Promise<any> {
		const employeeTableSchema = await this.schema.getSchema({ table })

		const EMPLOYEE = this.mockEmployee()

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: employeeTableSchema,
				data: {
					...EMPLOYEE,
					...employee,
				},
			},
			'testing',
		)) as FindOneResponseObject
	}

	async getEmployee(): Promise<any> {
		const employeeTableSchema = await this.schema.getSchema({ table })

		return (await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema: employeeTableSchema,
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteEmployee(employee_id: any): Promise<void> {
		const employeeTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: employeeTableSchema,
				id: employee_id,
			},
			'testing',
		)
	}
}
