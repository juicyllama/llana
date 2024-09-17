import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

export const USER = {
	email: faker.internet.email(),
	password: faker.internet.password(),
	role: 'VIEWER',
}

@Injectable()
export class UserTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async createUser(user: any): Promise<any> {
		const userTableSchema = await this.schema.getSchema({ table: 'User', x_request_id: 'testing' })

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: userTableSchema,
				data: {
					...USER,
					...user,
				},
			},
			'testing',
		)) as FindOneResponseObject
	}
}