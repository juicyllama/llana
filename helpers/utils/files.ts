import { exec } from 'child_process'
import { cli_error } from './logging'
import fs from 'fs'

export function fileExists(location: string): boolean {
	return fs.existsSync(location)
}

export async function writeToFile(file: string, content: string) {

	const command = `echo ${content} | sudo tee -a ${file} >/dev/null`

	exec(command, async (error, stdout, stderr) => {
		if (error) {
			cli_error(`error: ${stderr} (${stdout})`)
			return
		}
	})

	return
}
