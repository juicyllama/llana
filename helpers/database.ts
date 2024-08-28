import { cli_error, cli_success } from './utils/logging'
import mysql from 'mysql2/promise';
import { get } from './utils/env'
import { deconstructMysqlConnectionString } from './utils/database'

export async function query(sql: string) {

	try{
		const connection = await dbConnection()
		return await connection.query(sql)
	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}

export async function dbConnection(options?: { database?: string }) {

	try{
		const connectionString = get('MYSQL')
		const config = deconstructMysqlConnectionString(connectionString)

		return await mysql.createConnection({
			...config,
			...options
		});

	}catch (e: any) {
		cli_error(`Error creating database connection: ${e.message}`)
		return
	}
}

export async function validateConnection() {

	const config = deconstructMysqlConnectionString(get('MYSQL'))
	const connection = await dbConnection({ database: 'information_schema' })

	try{
		await connection.query('SELECT * FROM TABLES WHERE TABLE_SCHEMA = ? LIMIT 1', [config.database])
	}
	catch (e: any) {
		cli_error(`Error performing DB validation: ${e}`)
		return
	}

	cli_success(`Connection to database successful!`)	

}
