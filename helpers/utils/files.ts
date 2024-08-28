import { exec } from 'child_process'
import { cli_error } from './logging.js'
import fs from 'fs'
import path from 'path'

export function fileExists(location: string): boolean {
	const loc = path.resolve(location)
	console.log(loc)
	return fs.existsSync(loc)
}

export function folderExists(folderPath: string): boolean {
	try {
		const dirPath = path.resolve(folderPath);
		return !!fs.existsSync(dirPath)
	  } catch (err) {
		cli_error(`Error checking directory: ${err}`);
	  }

}

export async function createEmptyFile(file: string) {
	try {
		fs.writeFileSync(file, '')
	}catch (e) {
		cli_error(`Error creating file: ${e}`);
	}
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

export async function createFolder(folderPath: string) {

	try {
		if (!folderExists(folderPath)) {
		  	fs.mkdirSync(folderPath, { recursive: true });
		}
	  } catch (err) {
			console.error(`Error creating directory: ${err}`);
	  }
}
