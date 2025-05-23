import 'dotenv/config'

import { registerAs } from '@nestjs/config'

import { getDatabaseType } from '../helpers/Database'
import { DataSourceConfig } from '../types/datasource.types'

export default registerAs(
	'database',
	() =>
		<DataSourceConfig>{
			type: getDatabaseType(process.env.DATABASE_URI),
			host: process.env.DATABASE_URI,
			poolSize: Number(process.env.DATABASE_POOL_SIZE || 10),
			poolIdleTimeout: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT || 60000),
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
