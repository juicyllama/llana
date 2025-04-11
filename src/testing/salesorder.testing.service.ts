import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'SalesOrder'
let orderNumber = 1000

@Injectable()
export class SalesOrderTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockOrder(): any {
		orderNumber++
		return {
			orderId: orderNumber,
			orderDate: new Date(Date.now() - orderNumber * 1000000).toISOString(),
			requiredDate: new Date(Date.now() - orderNumber * 900000).toISOString(),
			shippedDate: new Date(Date.now() - orderNumber * 800000).toISOString(),
			freight: orderNumber * 1.5,
			shipName: `ShipName_${orderNumber}`,
			shipAddress: `Address_${orderNumber}`,
			shipCity: `City_${orderNumber}`.substring(0, 15),
			shipPostalCode: '123456',
			shipCountry: `Country_${orderNumber}`,
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
		const salesOrderTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: salesOrderTableSchema,
				id,
			},
			'testing',
		)
	}
}
