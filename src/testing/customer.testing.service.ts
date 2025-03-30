import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'Customer'
let customerNumber = 0

@Injectable()
export class CustomerTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockCustomer(userId: any): any {
		customerNumber++
		return {
			userId,
			companyName: `Company ${customerNumber}`,
			contactName: `first${customerNumber} last${customerNumber}`,
			contactTitle: 'CEO',
			address: `Address ${customerNumber}`,
			city: 'Berlin',
			region: 'Center',
			postalCode: '10092',
			country: 'Germany',
			email: `email${customerNumber}@example.com`,
			phone: '030-3456789',
			fax: '030-3456788',
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

	async deleteCustomer(id: any): Promise<void> {
		const customerTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: customerTableSchema,
				id,
			},
			'testing',
		)
	}
}
