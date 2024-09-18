import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

@Injectable()
export class EmployeeTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async getEmployee(): Promise<any> {
		const employeeTableSchema = await this.schema.getSchema({ table: 'Employee', x_request_id: 'testing' })

		return (await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema: employeeTableSchema,
			},
			'testing',
		)) as FindOneResponseObject
	}
}
