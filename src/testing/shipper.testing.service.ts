import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'Shipper'
let shipperNumber = 4000

@Injectable()
export class ShipperTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockShipper(): any {
		shipperNumber++
		return {
			shipperId: shipperNumber,
			phone: `555-000-1234`,
			companyName: `CompanyName ${shipperNumber}`,
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createShipper(shipper: any): Promise<any> {
		const shipperTableSchema = await this.schema.getSchema({ table })

		const SHIPPER = this.mockShipper()

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: shipperTableSchema,
				data: {
					...SHIPPER,
					...shipper,
				},
			},
			'testing',
		)) as FindOneResponseObject
	}

	async getShipper(): Promise<any> {
		const shipperTableSchema = await this.schema.getSchema({ table })

		return (await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema: shipperTableSchema,
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteShipper(id: any): Promise<void> {
		const shipperTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: shipperTableSchema,
				id,
			},
			'testing',
		)
	}
}
