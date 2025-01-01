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

	mockCustomer(userId: any): any {
		return {
			custId: faker.number.int({
				min: 1000,
				max: 9999,
			}),
			userId,
			companyName: faker.company.name(),
			contactName: faker.person.firstName() + ', ' + faker.person.lastName(),
			contactTitle: faker.person.prefix(),
			address: faker.location.streetAddress(),
			city: faker.location.city().substring(0, 10),
			region: faker.location.state(),
			postalCode: faker.location.zipCode(),
			country: faker.location.countryCode(),
			email: faker.internet.email(),
			phone: faker.phone.number(),
			fax: faker.phone.number(),
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createCustomer(customer: any): Promise<any> {
		const customerTableSchema = await this.schema.getSchema({ table })

		const CUSTOMER = this.mockCustomer(customer.userId)

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: customerTableSchema,
				data: {
					...CUSTOMER,
					...customer,
				},
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
				[customerTableSchema.primary_key]: customer_id,
			},
			'testing',
		)
	}
}
