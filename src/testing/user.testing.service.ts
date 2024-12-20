import { faker } from '@faker-js/faker'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { Encryption } from '../helpers/Encryption'
import { QueryPerform } from '../types/datasource.types'
import { Auth, AuthJWT, AuthPasswordEncryption, AuthType } from '../types/auth.types'

const table = 'User'

@Injectable()
export class UserTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
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
		const authentications = this.configService.get<Auth[]>('auth')
		const jwtConfig = authentications?.find(auth => auth.type === AuthType.JWT)

		if (!jwtConfig) {
			throw new Error('JWT authentication not configured properly')
		}

		const jwtAuthConfig = jwtConfig.table as AuthJWT
		const USER = this.mockUser()

		if (USER.password || user.password) {
			const password = user.password || USER.password
			USER.password = await this.encryption.encrypt(
				jwtAuthConfig.password.encryption || AuthPasswordEncryption.BCRYPT,
				password,
				jwtAuthConfig.password.salt
			)
		}

		return (await this.query.perform(
			QueryPerform.CREATE,
			{
				schema: userSchema,
				data: {
					...USER,
					...user,
					password: USER.password
				},
			},
			'testing',
		)) as FindOneResponseObject
	}

	async deleteUser(user_id: any): Promise<void> {
		const userSchema = await this.schema.getSchema({ table })
		await this.query.perform(
			QueryPerform.DELETE,
			{
				schema: userSchema,
				id: user_id,
			},
			'testing',
		)
	}
}
