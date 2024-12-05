import { Injectable } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

const table = 'Shipper'
@Injectable()
export class ShipperTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockShipper(): any {
		return {
			shipperId: faker.number.int({
				min: 1000,
				max: 9999,
			}),
			phone: faker.phone.number(),
			companyName: faker.company.name()
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

	async deleteShipper(shipper_id: any): Promise<void> {
		const shipperTableSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: shipperTableSchema,
				id: shipper_id,
			},
			'testing',
		)
	}
}
