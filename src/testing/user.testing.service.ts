import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'User'

@Injectable()
export class UserTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockUser(): any {
		return {
			email: faker.internet.email(),
			password: faker.internet.password(),
			role: 'USER',
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createUser(user: any): Promise<any> {
		const userSchema = await this.schema.getSchema({ table })

		const USER = this.mockUser()

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: userSchema,
				data: {
					...USER,
					...user,
				},
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteUser(id: any): Promise<void> {
		const userSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: userSchema,
				id,
			},
			'testing',
		)
	}
}
