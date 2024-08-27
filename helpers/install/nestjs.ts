import { exec } from 'child-process-promise'
import { cli_error } from '../utils/logging'
import { checkIfInstalled } from '../utils/pkm'

export async function installNestJs() {

	try{

		await checkIfInstalled('@nestjs/cli', 'npm')

		const closeNest = `git clone https://github.com/nestjs/typescript-starter.git .`
		await exec(closeNest)

		await checkIfInstalled('@nestjs/swagger', 'npm', false)

	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}
