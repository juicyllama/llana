import { Injectable } from '@nestjs/common'
import * as sqlstring from 'sqlstring'

@Injectable()
export class Request {
	constructor() {}

    /**
     * Pipes a request whilst sanitizing it
     */

    escapeText(string: string): string {
        return sqlstring.escape(string)
    }

    escapeObject(object: Record<string, any>): Record<string, any> {
        const new_object = {}

        for (const key in object) {
            new_object[key] = this.escapeText(object[key])
        }

        return new_object
    }

}