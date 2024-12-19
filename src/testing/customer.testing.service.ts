import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Logger } from '../helpers/Logger'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'Customer'

@Injectable()
export class CustomerTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly logger: Logger,
	) {}

	mockCustomer(): any {
		return {
			custId: faker.number.int({ min: 1, max: 999999 }), // Add custId for databases that don't auto-increment
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
		try {
			this.logger.log('Getting Customer schema', 'customer-testing')
			return await this.schema.getSchema({ table })
		} catch (error) {
			this.logger.error(`Failed to get Customer schema: ${error.message}`, 'customer-testing')
			throw new Error(`Failed to get Customer schema: ${error.message}`)
		}
	}

	async createCustomer(customer: any = this.mockCustomer()): Promise<any> {
		try {
			this.logger.log('Creating test customer', 'customer-testing')
			const customerTableSchema = await this.schema.getSchema({ table })

			// Keep custId in the data but mark as intentionally unused for lint
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { custId } = customer // Extract for lint purposes but don't remove from data

			const result = (await this.query.perform(
				QueryPerform.CREATE,
				{
					schema: customerTableSchema,
					data: customer, // Use full customer object including custId
				},
				'testing',
			)) as FindOneResponseObject

			this.logger.debug(
				`[customer-testing] Created customer with result: ${JSON.stringify(result)}`,
				'customer-testing',
			)

			return result
		} catch (error) {
			this.logger.error(`Failed to create test customer: ${error.message}`, 'customer-testing')
			throw new Error(`Failed to create test customer: ${error.message}`)
		}
	}

	async deleteCustomer(customer_id: any): Promise<void> {
		try {
			this.logger.log(`Deleting test customer: ${customer_id}`, 'customer-testing')
			const customerTableSchema = await this.schema.getSchema({ table })
			await this.query.perform(
				QueryPerform.DELETE,
				{
					schema: customerTableSchema,
					id: customer_id,
				},
				'testing',
			)
		} catch (error) {
			this.logger.error(`Failed to delete test customer: ${error.message}`, 'customer-testing')
			throw new Error(`Failed to delete test customer: ${error.message}`)
		}
	}
}
