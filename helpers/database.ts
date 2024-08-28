import { cli_error, cli_success } from './utils/logging.js'
import mysql, { ConnectionOptions } from 'mysql2/promise';
import { get } from './utils/env.js'
import { deconstructMysqlConnectionString } from './utils/database.js'

export async function query(sql: string, options?: ConnectionOptions ) {

	try{
		const connection = await dbConnection(options)
		return await connection.query(sql)
	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}

export async function dbConnection(options?: ConnectionOptions) {

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
