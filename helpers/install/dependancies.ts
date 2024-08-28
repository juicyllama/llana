import { exec } from 'child-process-promise'
import { cli_log, cli_success } from '../utils/logging.js'
import { checkIfInstalled, addToPackageJson } from '../utils/pkm.js'
import { fileExists } from '../utils/files.js'
import { addScriptToPackageJson } from '../utils/package.json.js'

export async function installDependancies() {

		cli_log(`Installing project dependencies`)


		if (!fileExists('src/main.ts')) {
			cli_log(`Installing project code`)
			const closeNest = `git clone https://github.com/nestjs/typescript-starter.git .`
			await exec(closeNest)
		}

		if(!await checkIfInstalled('@nestjs/cli')) 		await addToPackageJson('@nestjs/cli')
		if(!await checkIfInstalled('@nestjs/config')) 	await addToPackageJson('@nestjs/config')
		if(!await checkIfInstalled('typeorm')) 			await addToPackageJson('typeorm')
		if(!await checkIfInstalled('@nestjs/typeorm')) 	await addToPackageJson('@nestjs/typeorm')
		if(!await checkIfInstalled('@nestjs/swagger')) 	await addToPackageJson('@nestjs/swagger')
		if(!await checkIfInstalled('dotenv')) 			await addToPackageJson('dotenv')
		if(!await checkIfInstalled('lodash')) 			await addToPackageJson('lodash')
		if(!await checkIfInstalled('@juicyllama/utils')) await addToPackageJson('@juicyllama/utils')
		await addScriptToPackageJson('llama:boot', 'llana boot')
		await addScriptToPackageJson('llama:install', 'llana install')

		cli_success(`Project dependencies installed successfully`)

}
