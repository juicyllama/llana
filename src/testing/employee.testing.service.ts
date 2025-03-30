import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'Employee'
let employeeNumber = 2000

@Injectable()
export class EmployeeTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockEmployee(): any {
		employeeNumber++
		return {
			employeeId: employeeNumber,
			email: `employee${employeeNumber}@test.com`,
			notes: `Notes for employee ${employeeNumber}`,
			phone: `555-000-1234}`,
			photo: `photo${employeeNumber}.jpg`,
			title: `Title ${employeeNumber}`,
			mobile: `555-111-1234}`,
			lastName: `LastName`,
			firstName: `FirstName`,
			hireDate: new Date(2000, 0, 1),
			address: `Address ${employeeNumber}`,
			city: `City${employeeNumber}`,
			region: `Region${employeeNumber}`,
			postalCode: '123456',
			country: `Country${employeeNumber}`,
			extension: `Ext`,
			birthDate: new Date(1980, 0, 1),
			photoPath: `/photos/employee${employeeNumber}.jpg`,
			titleOfCourtesy: `Mr./Ms. ${employeeNumber}`,
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

	async deleteEmployee(id: any): Promise<void> {
		const employeeTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: employeeTableSchema,
				id,
			},
			'testing',
		)
	}
}
