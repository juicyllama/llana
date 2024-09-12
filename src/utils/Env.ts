import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { Environment, fromStringToEnv } from './Env.types'

export class Env {
	/**
	 * Get an enum key based on it's value
	 */

	static get(): Environment {
		return fromStringToEnv()
	}

	/**
	 * Checks if it's a production environment
	 */

	static IsProd(): boolean {
		return this.get() === Environment.production
	}

	/**
	 * Checks if it's a development environment
	 */

	static IsDev(): boolean {
		return this.get() === Environment.development
	}

	/**
	 * Checks if it's a test environment
	 */

	static IsTest(): boolean {
		return this.get() === Environment.test
	}

	/**
	 * Checks if it's NOT a test environment
	 */

	static IsNotTest(): boolean {
		return this.get() !== Environment.test
	}

	/**
	 * Checks if it's NOT a prod environment
	 */

	static IsNotProd(): boolean {
		return this.get() !== Environment.production
	}

	/**
	 * Checks if it's a sandbox environment
	 */

	static IsSandbox(): boolean {
		return this.get() === Environment.sandbox
	}

	//todo allow a .env value to override this if exists
	static useCache(): boolean {
		return this.IsNotTest()
	}

	/**
	 * Reads the .env file and returns an array of lines
	 */
	static readEnvVars(options: { envPath: string; fileName: string }) {
		if (!options.envPath) options.envPath = './'
		if (!options.fileName) options.fileName = '.env'

		return fs.readFileSync(path.resolve(options.envPath, options.fileName), 'utf-8').split(os.EOL)
	}

	/**
	 * Finds the key in .env files and returns the corresponding value
	 */
	static getEnvValue(options: { key: string; envPath: string; fileName: string }): string {
		if (!options.envPath) options.envPath = './'
		if (!options.fileName) options.fileName = '.env'

		const matchedLine = Env.readEnvVars({ envPath: options.envPath, fileName: options.fileName }).find(
			line => line.split('=')[0] === options.key,
		)
		const result = matchedLine !== undefined ? matchedLine.split('=')[1] : null
		return result !== null ? result.replace(/"/g, '') : ''
	}

	/**
	 * Updates value for existing key or creates a new key=value line
	 * This function is a modified version of https://stackoverflow.com/a/65001580/3153583
	 */
	static setEnvValue(options: { key: string; value: string; envPath?: string; fileName?: string }) {
		if (!options.envPath) options.envPath = './'
		if (!options.fileName) options.fileName = '.env'

		const envVars = Env.readEnvVars({ envPath: options.envPath, fileName: options.fileName })
		const targetLine = envVars.find(line => line.split('=')[0] === options.key)
		if (targetLine !== undefined) {
			const targetLineIndex = envVars.indexOf(targetLine)
			envVars.splice(targetLineIndex, 1, `${options.key}="${options.value}"`)
		} else {
			// create new key value
			envVars.push(`${options.key}="${options.value}"`)
		}
		// write everything back to the file system
		fs.writeFileSync(path.resolve(options.envPath, options.fileName), envVars.join(os.EOL))
	}

	static setEnv(options: { values: { [key: string]: string }; envPath?: string; fileName?: string }) {
		for (const key of Object.keys(options.values)) {
			Env.setEnvValue({
				key: key,
				value: options.values[key],
				envPath: options.envPath,
				fileName: options.fileName,
			})
		}
	}
}
