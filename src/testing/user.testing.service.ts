import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'

@Injectable()
export class UserTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async createUser(user: any): Promise<any> {
		const userTableSchema = await this.schema.getSchema({ table: 'User', x_request_id: 'testing' })

		const USER = {
			email: faker.internet.email(),
			password: faker.internet.password(),
			role: 'VIEWER',
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			createdAt: faker.date.past().toISOString(),
			updatedAt: faker.date.past().toISOString(),
		}

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
