import 'dotenv/config'

import * as escape from 'escape-html'

import { DatabaseType } from '../types/database.types'

export function deconstructConnectionString(connectionString: string): {
	type: DatabaseType
	host: string
	port: number
	username: string
	password: string
	database: string
} {
	// Special case for Airtable
	if (connectionString.includes('airtable')) {
		const [baseId, apiKey] = connectionString.split('://')[1].split('@')
		return {
			type: DatabaseType.AIRTABLE,
			host: 'api.airtable.com',
			port: 443,
			username: 'apikey',
			password: apiKey,
			database: baseId,
		}
	}

	const regex = /^(?<type>.*?):\/\/(?<username>.*?):(?<password>.*?)@(?<host>.*?):(?<port>\d+)\/(?<database>.*?)$/
	const match = connectionString.match(regex)

	if (!match || !match.groups) {
		throw new Error('Invalid connection string format')
	}

	const { type, username, password, host, port, database } = match.groups

	return {
		type: getDatabaseType(type),
		host,
		port: parseInt(port, 10),
		username,
		password,
		database,
	}
}

export function UrlToTable(uri: string, dropSlashes?: number): string {
	//Remove first slash
	uri = uri.substring(1)

	//Drop last part of the url based on the number of slashes
	if (dropSlashes && dropSlashes > 0) {
		uri = uri.split('/').slice(0, -dropSlashes).join('/')
	}

	//Sanitize string
	uri = uri.replace(/[^a-zA-Z0-9]/g, '_')

	return escape(uri)
}

export function getDatabaseType(uri: string): DatabaseType {
	if (uri.includes('mysql')) {
		return DatabaseType.MYSQL
	} else if (uri.includes('postgresql')) {
		return DatabaseType.POSTGRES
	} else if (uri.includes('mongodb')) {
		return DatabaseType.MONGODB
	} else if (uri.includes('mssql')) {
		return DatabaseType.MSSQL
	} else if (uri.includes('airtable')) {
		return DatabaseType.AIRTABLE
	} else {
		throw new Error('Database type not supported')
	}
}

export function getDatabaseName(connectionString: string): string {
	const deconstructed = deconstructConnectionString(connectionString)
	return deconstructed.database
}
