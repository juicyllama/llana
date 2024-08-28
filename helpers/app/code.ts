import { exec } from 'child-process-promise'
import { cli_error, cli_log, cli_success } from '../utils/logging.js'
import { fileExists, folderExists, createFolder, createEmptyFile } from '../utils/files.js'
import { set } from '../utils/env.js'

export async function setupFiles() {

	try{

		cli_log(`Setting up latest application code`)

		const bin_location = `npm root -g`
		let { stdout: binPath } = await exec(bin_location)
		binPath = binPath.replace(/(\r\n|\n|\r)/gm, "");


		if(!fileExists('.env')){
			createEmptyFile('.env')
		}

		const src_files = `rsync -av ${binPath}/@juicyllama/llana/src/ ./src/`
		await exec(src_files)

		set('PORT', '3030')

		if(!folderExists('config')){
			await createFolder('config')
		}

		if(!fileExists('auth.ts')){
			const auth = `cp ${binPath}/@juicyllama/llana/helpers/app/files/auth.ts ./config/auth.ts`
			await exec(auth)
		}

		if(!fileExists('restrictions.ts')){
			const restrictions = `cp ${binPath}/@juicyllama/llana/helpers/app/files/restrictions.ts ./config/restrictions.ts`
			await exec(restrictions)
		}

		cli_success(`Updated to latest application code`)

	}
	catch (e: any) {
		cli_error(`Error: ${e}`)
		return
	}

}