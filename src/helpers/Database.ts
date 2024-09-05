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
	} else {
		throw new Error('Database type not supported')
	}
}
