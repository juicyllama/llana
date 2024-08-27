import { exec } from 'child-process-promise'
import { cli_error } from '../utils/logging'

export async function setupFiles() {

	try{

		const bin_location = `npm root -g`
		const { stdout: binPath } = await exec(bin_location)

		const controller = `cp ${binPath}/@juicyllama/llana/helpers/app/files/app.controller.ts ./src`
		await exec(controller)

	}
	catch (e: any) {
		cli_error(`error: ${e}`)
		return
	}

}
