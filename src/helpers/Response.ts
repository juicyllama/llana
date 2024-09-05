import { Injectable } from '@nestjs/common'
import * as escape from 'escape-html'

@Injectable()
export class Response {
	constructor() {}

	/**
	 * Pipes a response whilst sanitizing it
	 */

	text(string: string): string {
		return escape(string)
	}
}
