import 'dotenv/config'

import { registerAs } from '@nestjs/config'

import { getDatabaseType } from '../helpers/Database'
import { DatabaseConfig } from '../types/database.types'

export default registerAs(
	'database',
	() =>
		<DatabaseConfig>{
			type: getDatabaseType(process.env.DATABASE_URI),
			host: process.env.DATABASE_URI,
			defaults: {
				limit: Number(process.env.DEFAULT_LIMIT) || 20,
				relations: {
					limit: Number(process.env.DEFAULT_RELATIONS_LIMIT) || 20,
				},
			},
			deletes: {
				soft: Boolean(process.env.SOFT_DELETE) || false,
				column: process.env.SOFT_DELETE_COLUMN,
			},
		},
)
