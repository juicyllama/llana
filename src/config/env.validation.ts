import * as Joi from 'joi'

import { AuthPasswordEncryption } from '../types/auth.types'

export const envValidationSchema = Joi.object({
	NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
	PORT: Joi.number().empty('').default(3000),
	DATABASE_URI: Joi.string().uri().required(),
	JWT_KEY: Joi.string().min(8).default('S$3cr3tK3y'),
	JWT_EXPIRES_IN: Joi.string().default('1d'),
	AUTH_USER_API_KEY_LOCATION: Joi.string().default('HEADER'),
	AUTH_USER_API_KEY_NAME: Joi.string().default('x-api-key'),
	AUTH_USER_TABLE_NAME: Joi.string().default('User'),
	AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN: Joi.string().optional(),
	AUTH_USER_API_KEY_FIELD: Joi.string().default('UserApiKey.apiKey'),
	AUTH_USER_IDENTITY_COLUMN: Joi.string().optional(),
	AUTH_USER_TABLE_USERNAME_FIELD: Joi.string().default('email'),
	AUTH_USER_TABLE_PASSWORD_FIELD: Joi.string().default('password'),
	AUTH_USER_TABLE_PASSWORD_ENCRYPTION: Joi.string().default(AuthPasswordEncryption.BCRYPT),
	AUTH_USER_TABLE_PASSWORD_SALT: Joi.number().default(10),
	DEFAULT_LIMIT: Joi.number().default(20),
	DEFAULT_RELATIONS_LIMIT: Joi.number().default(20),
	SOFT_DELETE_COLUMN: Joi.string().optional(),
	CRON_EXPRESSION_WEBHOOKS_SEND: Joi.string()
		.pattern(
			/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
		)
		.default('*/5 * * * *')
		.messages({
			'string.pattern.base': 'Invalid cron expression format',
		}),
	DISABLE_WEBHOOKS: Joi.boolean().default(false),
	DOCS_TITLE: Joi.string().default('API Documentation'),
	HOSTS: Joi.string().optional(),
})
