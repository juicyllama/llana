import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'Customer'

@Injectable()
export class CustomerTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockCustomer(): any {
		return {
			companyName: faker.company.name().substring(0, 40),
			contactName: (faker.person.firstName() + ', ' + faker.person.lastName()).substring(0, 30),
			contactTitle: faker.person.prefix().substring(0, 30),
			address: faker.location.streetAddress().substring(0, 60),
			city: faker.location.city().substring(0, 15),
			region: faker.location.state().substring(0, 15),
			postalCode: faker.location.zipCode().substring(0, 10),
			country: faker.location.countryCode().substring(0, 15),
			email: faker.internet.email().substring(0, 225),
			phone: faker.phone.number().substring(0, 24),
			mobile: faker.phone.number().substring(0, 24),
			fax: faker.phone.number().substring(0, 24),
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createCustomer(customer: any = this.mockCustomer()): Promise<any> {
		const customerTableSchema = await this.schema.getSchema({ table })

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { custId, ...customerData } = customer

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: customerTableSchema,
				data: customerData,
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteCustomer(customer_id: any): Promise<void> {
		const customerTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: customerTableSchema,
				id: customer_id,
			},
			'testing',
		)
	}
}
