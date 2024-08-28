import { exec } from 'child-process-promise'
import { cli_error } from '../utils/logging'
import { fileExists } from '../utils/files'
import { get } from '../utils/env'

export async function setupFiles() {

	try{

		const bin_location = `npm root -g`
		let { stdout: binPath } = await exec(bin_location)
		binPath = binPath.replace(/(\r\n|\n|\r)/gm, "");

		const key = 'MYSQL';
		const value = get(key);

		if (value) {
			if (value.trim() === '') {
				const env = `cp ${binPath}/@juicyllama/llana/helpers/app/files/.env .`
				await exec(env)
			} 
		} else {
			const env = `cp ${binPath}/@juicyllama/llana/helpers/app/files/.env .`
			await exec(env)
		}

		//TODO: confirm we can copy multiple files this way
		const controller = `cp ${binPath}/@juicyllama/llana/src/*.ts ./src`
		await exec(controller)

		if(!fileExists('auth.ts')){
			const auth = `cp ${binPath}/@juicyllama/llana/helpers/app/files/auth.ts ./config`
			await exec(auth)
		}

		if(!fileExists('restrictions.ts')){
			const restrictions = `cp ${binPath}/@juicyllama/llana/helpers/app/files/restrictions.ts ./config`
			await exec(restrictions)
		}
		

	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}