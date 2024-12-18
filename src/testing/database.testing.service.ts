import { Injectable } from '@nestjs/common'
import { Logger } from '../helpers/Logger'
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
		private readonly logger: Logger,
	) {}

	async createDuplicateError(): Promise<any> {
		try {
			this.logger.log('Attempting to create duplicate error test case', 'database-testing')
			const customerSchema = await this.schema.getSchema({ table: 'Customer' })
			if (!customerSchema) {
				throw new Error('Failed to load Customer schema')
			}

			// Create a generic customer record with mock data
			const mockData = this.customerTestingService.mockCustomer()
			const customer = await this.customerTestingService.createCustomer(mockData)

			try {
				// Attempt to create duplicate record with same data
				await this.query.perform(
					QueryPerform.CREATE,
					{
						schema: customerSchema,
						data: {
							...mockData,
							email: mockData.email, // Ensure email is duplicated to trigger unique constraint
						},
					},
					'testing',
				)
			} catch (error) {
				// Clean up the original record and return the error
				await this.customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
				return error
			}

			// If no error occurred, clean up and throw
			await this.customerTestingService.deleteCustomer(customer[customerSchema.primary_key])
			throw new Error('Expected duplicate error was not thrown')
		} catch (error) {
			this.logger.error(`Failed to create duplicate error test: ${error.message}`, 'database-testing')
			throw new Error(`Failed to create duplicate error test: ${error.message}`)
		}
	}

	async createTypeMismatchError(): Promise<any> {
		const customerSchema = await this.schema.getSchema({ table: 'Customer' })
		if (!customerSchema) {
			throw new Error('Failed to load Customer schema')
		}

		// Create invalid data with wrong type for string field
		const mockData = this.customerTestingService.mockCustomer()
		const invalidData = {
			...mockData,
			companyName: 12345, // Use number for string field to trigger type mismatch
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
		const uri = process.env.DATABASE_URI
		if (!uri) {
			throw new Error('DATABASE_URI environment variable is not set')
		}

		if (uri.includes('mysql')) {
			return DataSourceType.MYSQL
		} else if (uri.includes('postgresql')) {
			return DataSourceType.POSTGRES
		} else if (uri.includes('mongodb')) {
			return DataSourceType.MONGODB
		} else if (uri.includes('mssql')) {
			return DataSourceType.MSSQL
		}
		throw new Error('Unsupported database type')
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
