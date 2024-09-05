import { registerAs } from '@nestjs/config'
export default registerAs(
	'jwt',
	() =>
		<any>{
			secret: process.env.JWT_KEY,
			signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
		},
)
