import { cli_error } from '../utils/logging.js'
import prompt from 'prompt-sync'
import { get, set } from '../utils/env.js'

export async function configDatabase() {

	try{
		const key = 'MYSQL';
		const value = get(key);

		if (value) {
			if (value.trim() === '') {	
			   await promptForDatabase(key);
			} 
		} else {
			await promptForDatabase(key);
		}
	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}

async function promptForDatabase(key: string) {
	const database = prompt()('Please enter your database connection string (mysql://user:pass@host:port/database): ')
	set(key, database)
}
