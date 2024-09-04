import { ConsoleLogger, Injectable } from '@nestjs/common'

@Injectable()
export class Logger extends ConsoleLogger {
	constructor() {
		super('Llana')
	}
}
