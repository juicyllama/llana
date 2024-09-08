import { registerAs } from '@nestjs/config'

import { Auth, AuthAPIKey, AuthJWT, AuthLocation, AuthPasswordEncryption, AuthType } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs(
	'auth',
	() =>
		<Auth[]>[
			{
				type: AuthType.APIKEY,
				location: process.env.AUTH_USER_API_KEY_LOCATION ?? AuthLocation.HEADER,
				name: process.env.AUTH_USER_API_KEY_NAME ?? 'x-api-key',
				table: <AuthAPIKey>{
					name: process.env.AUTH_USER_TABLE_NAME ?? 'User', //should start at your main users identity table
					column: process.env.AUTH_USER_API_KEY_FIELD ?? 'UserApiKey.apiKey',
					where: [
						{
							column: 'deletedAt',
							operator: WhereOperator.null,
						},
					],
				},
			},
			{
				type: AuthType.JWT,
				routes: {
					exclude: ['auth/login'],
				},
				table: <AuthJWT>{
					name: process.env.AUTH_USER_TABLE_NAME ?? 'User', //should start at your main users identity table
					columns: {
						username: process.env.AUTH_USER_TABLE_USERNAME_FIELD ?? 'email',
						password: process.env.AUTH_USER_TABLE_PASSWORD_FIELD ?? 'password',
					},
					password: {
						encryption: process.env.AUTH_USER_TABLE_PASSWORD_ENCRYPTION ?? AuthPasswordEncryption.SHA512,
					},
					where: [
						{
							column: 'deletedAt',
							operator: WhereOperator.null,
						},
					],
				},
			},
		],
)
