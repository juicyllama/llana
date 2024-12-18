import { Injectable } from '@nestjs/common'

import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { DataSourceSchema, DataSourceType, QueryPerform } from '../types/datasource.types'
import { CustomerTestingService } from './customer.testing.service'
import { UserTestingService } from './user.testing.service'

@Injectable()
export class DatabaseTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly customerTestingService: CustomerTestingService,
		private readonly userTestingService: UserTestingService,
	) {}

	async createDuplicateError(): Promise<any> {
		const customerSchema = await this.schema.getSchema({ table: 'Customer' })
		const customer = await this.customerTestingService.createCustomer({})

		try {
			// Attempt to create duplicate record
			await this.query.perform(
				QueryPerform.CREATE,
				{
					schema: customerSchema,
					data: customer,
				},
				'testing',
			)
		} catch (error) {
			// Clean up the original record
			await this.customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
			return error
		}

		// If no error occurred, clean up and throw
		await this.customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
		throw new Error('Expected duplicate error was not thrown')
	}

	async createTypeMismatchError(): Promise<any> {
		const customerSchema = await this.schema.getSchema({ table: 'Customer' })
		const invalidData = {
			...(await this.customerTestingService.mockCustomer()),
			custId: 'not-a-number', // Force type mismatch for numeric field
		}

		try {
			await this.query.perform(
				QueryPerform.CREATE,
				{
					schema: customerSchema,
					data: invalidData,
				},
				'testing',
			)
		} catch (error) {
			return error
		}

		throw new Error('Expected type mismatch error was not thrown')
	}

	async getDatabaseType(): Promise<DataSourceType> {
		return this.query.getDatabaseType()
	}

	async getSchema(table: string): Promise<DataSourceSchema> {
		return this.schema.getSchema({ table })
	}

	async cleanup(customerId: string | number): Promise<void> {
		if (customerId) {
			await this.customerTestingService.deleteCustomer(customerId)
		}
	}
}
