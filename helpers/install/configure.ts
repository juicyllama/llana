import { cli_error } from '../utils/logging'
import prompt from 'prompt-sync'
import { exec } from 'child-process-promise'
import { get } from '../utils/env'

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
		const updateMysqlEnvValue = `sed -i '' 's#^${key}=.*#${key}="${database}"#' .env`
		await exec(updateMysqlEnvValue)	
}
