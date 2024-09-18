import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

@Injectable()
export class ShipperTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async getShipper(): Promise<any> {
		const shipperTableSchema = await this.schema.getSchema({ table: 'Shipper', x_request_id: 'testing' })

		return (await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema: shipperTableSchema,
			},
			'testing',
		)) as FindOneResponseObject
	}
}
