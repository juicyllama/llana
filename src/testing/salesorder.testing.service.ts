import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'SalesOrder'

@Injectable()
export class SalesOrderTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockOrder(): any {
		return {
			orderId: faker.number.int({
				min: 1000,
				max: 9999,
			}),
			orderDate: faker.date.past().toISOString(),
			requiredDate: faker.date.past().toISOString(),
			shippedDate: faker.date.past().toISOString(),
			freight: faker.number.float(),
			shipName: faker.company.name(),
			shipAddress: faker.location.streetAddress(),
			shipCity: faker.location.city().substring(0, 15),
			shipPostalCode: faker.location.zipCode(),
			shipCountry: faker.location.countryCode(),
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createOrder(order: { custId; employeeId; shipperId; orderId? }): Promise<any> {
		const salesOrderTableSchema = await this.schema.getSchema({ table, x_request_id: 'testing' })

		const ORDER = this.mockOrder()

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: salesOrderTableSchema,
				data: {
					...ORDER,
					...order,
				},
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteOrder(id: any): Promise<void> {
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
