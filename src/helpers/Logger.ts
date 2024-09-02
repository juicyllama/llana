import { Injectable, ConsoleLogger } from '@nestjs/common'

@Injectable()
export class Logger extends ConsoleLogger {
	constructor() {
		super('Llana')
	}
}
