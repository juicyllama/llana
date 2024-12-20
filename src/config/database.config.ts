import 'dotenv/config'

import { registerAs } from '@nestjs/config'

import { deconstructConnectionString, getDatabaseType } from '../helpers/Database'
import { DataSourceConfig } from '../types/datasource.types'

export default registerAs(
	'database',
	() => {
		const uri = process.env.DATABASE_URI
		if (!uri) {
			throw new Error('DATABASE_URI environment variable is required')
		}

		const config = deconstructConnectionString(uri)

		return <DataSourceConfig>{
			type: config.type,
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.username,
			password: config.password,
			defaults: {
				limit: Number(process.env.DEFAULT_LIMIT) || 20,
				relations: {
					limit: Number(process.env.DEFAULT_RELATIONS_LIMIT) || 20,
				},
			},
			deletes: {
				soft: process.env.SOFT_DELETE_COLUMN ?? undefined,
			},
		}
	},
)
