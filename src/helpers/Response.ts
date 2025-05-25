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

	/**
	 * Safely serialize an object to JSON, handling circular references
	 * @param obj Object to serialize
	 * @returns Safe JSON string
	 */
	safeJSON(obj: any): string {
		const seen = new WeakSet()
		return JSON.stringify(obj, (key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (seen.has(value)) {
					return '[Circular Reference]'
				}
				seen.add(value)
			}
			return value
		})
	}
}
