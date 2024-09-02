import { registerAs } from '@nestjs/config'
import { AuthAPIKey, AuthJWT, AuthPasswordEncryption, Auth, AuthLocation, AuthType } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs(
	'auth',
	() => <Auth[]>[
			{
				type: AuthType.APIKEY,
				location: AuthLocation.HEADER,
				name: 'x-api-key',
				table: <AuthAPIKey>{
					name: 'users', //should start at your main users indentity table
					column: 'users_api_keys.api_key',
					where: [
						{
							column: 'deleted_at',
							operator: WhereOperator.null,
						},
					],
				}
			},
			{
				type: AuthType.JWT,
				routes: {
					exclude: ['auth/login'],
				},
				table: <AuthJWT>{
					name: 'users', //should start at your main users indentity table
					columns: { email: 'email', password: 'password' },
					password: {
						encryption: AuthPasswordEncryption.SHA512,
						salt: null,
					},
					where: [
						{
							column: 'deleted_at',
							operator: WhereOperator.null,
						},
					],
				},
			},
		]
)
