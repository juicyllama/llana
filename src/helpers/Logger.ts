import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common'

import { APP_BOOT_CONTEXT } from '../app.constants'
import { Env } from '../utils/Env'
import { Environment } from '../utils/Env.types'

@Injectable()
export class Logger extends ConsoleLogger {
	constructor() {
		super('Llana')
	}

	error(message: any, ...optionalParams: [...any, string?]): void {
		if (logLevel().includes('error')) {
			super.error(message, ...optionalParams)
		}
	}

	warn(message: any, ...optionalParams: [...any, string?]): void {
		if (logLevel().includes('warn')) {
			super.warn(message, ...optionalParams)
		}
	}

	log(message: any, ...optionalParams: [...any, string?]): void {
		if (logLevel().includes('log')) {
			super.log(message, ...optionalParams)
		}
	}

	debug(message: any, ...optionalParams: [...any, string?]): void {
		if (logLevel().includes('debug')) {
			super.debug(message, ...optionalParams)
		}
	}

	verbose(message: any, ...optionalParams: [...any, string?]): void {
		if (logLevel().includes('verbose')) {
			super.verbose(message, ...optionalParams)
		}
	}

	status(): void {
		this.log(`--------- Logging Status ---------`, APP_BOOT_CONTEXT)
		this.error(`This is an error`, APP_BOOT_CONTEXT)
		this.warn(`This is a warning`, APP_BOOT_CONTEXT)
		this.log(`This is a log`, APP_BOOT_CONTEXT)
		this.debug(`This is a debug`, APP_BOOT_CONTEXT)
		this.verbose(`This is a verbose`, APP_BOOT_CONTEXT)
		this.log(`------- Logging Status End -------`, APP_BOOT_CONTEXT)
	}

	table(data: any): void {
		console.table(data)
	}
}

export function logLevel(): LogLevel[] {
	let logLevels: LogLevel[]

	switch (Env.get()) {
		case Environment.production:
			logLevels = <LogLevel[]>process.env.LOG_LEVELS?.split(',') ?? ['error', 'warn', 'log']
			break
		case Environment.sandbox:
			logLevels = <LogLevel[]>process.env.LOG_LEVELS?.split(',') ?? ['error', 'warn', 'log', 'debug']
			break
		case Environment.test:
			logLevels = <LogLevel[]>process.env.LOG_LEVELS?.split(',') ?? ['error', 'warn', 'log']
			break
		case Environment.development:
			logLevels = <LogLevel[]>process.env.LOG_LEVELS?.split(',') ?? [
				'error',
				'warn',
				'log',
				'debug',
				'verbose',
			]
			break
		default:
			logLevels = ['error', 'warn', 'log']
			break
	}

	return logLevels
}
