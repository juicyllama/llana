import { exec } from 'child-process-promise'
import { cli_error, cli_log } from '../utils/logging'
import { checkIfInstalled } from '../utils/pkm'
import * as fs from 'fs';
import * as path from 'path';

export async function installNestJs() {

	try{

		await checkIfInstalled('@nestjs/cli', 'npm')

		//Clone nest starter project if not already cloned		
		if (!fs.existsSync('./package.json')) {
			cli_log('Cloning NestJS project...')
			const closeNest = `git clone https://github.com/nestjs/typescript-starter.git .`
			await exec(closeNest)
		}

		await checkIfInstalled('@nestjs/swagger', 'npm', false)

	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}
