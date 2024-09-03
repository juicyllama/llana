import { registerAs } from '@nestjs/config'
import { AuthAPIKey, AuthJWT, AuthPasswordEncryption, Auth, AuthLocation, AuthType } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs(
	'auth',
	() =>
		<Auth[]>[
			{
				type: AuthType.APIKEY,
				location: AuthLocation.HEADER,
				name: 'x-api-key',
				table: <AuthAPIKey>{
					name: 'User', //should start at your main users indentity table
					column: 'UserApiKey.apiKey',
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
					name: 'User', //should start at your main users indentity table
					columns: { username: 'email', password: 'password' },
					password: {
						encryption: AuthPasswordEncryption.SHA512,
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
