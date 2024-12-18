import { Injectable } from '@nestjs/common'

import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import type { DataSourceSchema } from '../types/datasource.types'
import { DataSourceType, QueryPerform } from '../types/datasource.types'
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

	async createDuplicateError(dbType?: DataSourceType): Promise<any> {
		const customerSchema = await this.schema.getSchema({ table: 'Customer' })

		// Use specific field based on database type
		const uniqueField = dbType === DataSourceType.MONGODB ? '_id' : 'custId'
		const customer = await this.customerTestingService.createCustomer({
			[uniqueField]: 'test-duplicate-id',
		})

		try {
			// Create first record
			await this.query.perform(
				QueryPerform.CREATE,
				{
					schema: customerSchema,
					data: customer,
				},
				'testing',
			)

			// Attempt to create duplicate record to trigger error
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

	async createTypeMismatchError(dbType?: DataSourceType): Promise<any> {
		const customerSchema = await this.schema.getSchema({ table: 'Customer' })

		// Create type mismatch based on database type
		const invalidValue =
			dbType === DataSourceType.MONGODB ? { $invalid: 'mongodb-specific-invalid-operator' } : 'not-a-number'

		const invalidData = {
			...(await this.customerTestingService.mockCustomer()),
			custId: invalidValue,
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
