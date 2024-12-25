import 'dotenv/config'

import { registerAs } from '@nestjs/config'

import { getDatabaseType } from '../helpers/Database'
import { DataSourceConfig } from '../types/datasource.types'

export default registerAs(
	'database',
	() =>
		<DataSourceConfig>{
			type: getDatabaseType(process.env.DATABASE_URI),
			host: process.env.DATABASE_URI?.startsWith('oracle://') 
				? new URL(process.env.DATABASE_URI).host
				: process.env.DATABASE_URI,
			username: process.env.DATABASE_URI?.startsWith('oracle://')
				? new URL(process.env.DATABASE_URI).username
				: undefined,
			password: process.env.DATABASE_URI?.startsWith('oracle://')
				? new URL(process.env.DATABASE_URI).password
				: undefined,
			database: process.env.DATABASE_URI?.startsWith('oracle://')
				? new URL(process.env.DATABASE_URI).pathname.slice(1)
				: undefined,
			defaults: {
				limit: Number(process.env.DEFAULT_LIMIT) || 20,
				relations: {
					limit: Number(process.env.DEFAULT_RELATIONS_LIMIT) || 20,
				},
			},
			deletes: {
				soft: process.env.SOFT_DELETE_COLUMN ?? undefined,
			},
		},
)
