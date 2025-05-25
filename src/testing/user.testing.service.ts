import { Injectable } from '@nestjs/common'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/datasource.types'

const table = 'User'
let userNumber = new Date().getTime() // Simple way to generate a unique number based on current time

@Injectable()
export class UserTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	mockUser(props = {}): any {

		userNumber++

		return {
			email: `test-user${userNumber}@gmail.com`,
			password: 'asdlkjh132093ERWF',
			role: 'USER',
			firstName: `First${userNumber}`,
			lastName: `Last${userNumber}`,
			...props,
		}
	}

	async getSchema(): Promise<any> {
		return await this.schema.getSchema({ table })
	}

	async createUser(user?: any): Promise<any> {
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
