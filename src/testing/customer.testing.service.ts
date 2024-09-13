import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'
import { FindOneResponseObject } from '../dtos/response.dto'

export const CUSTOMER = {
	companyName: faker.company.name(),
	contactName: faker.person.firstName() + ', ' + faker.person.lastName(),
	contactTitle: faker.person.prefix(),
	address: faker.location.streetAddress(),
	city: faker.location.city().substring(0, 10),
	region: faker.location.state(),
	postalCode: faker.location.zipCode(),
	country: faker.location.countryCode(),
}

@Injectable()
export class CustomerTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async createCustomer(customer: any): Promise<any> {
		const customerTableSchema = await this.schema.getSchema({ table: 'Customer' })

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
}
