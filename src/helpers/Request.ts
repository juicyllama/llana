import { Injectable } from '@nestjs/common'
import * as sqlstring from 'sqlstring'
import * as escape from 'escape-html'

@Injectable()
export class Request {
	constructor() {}

    /**
     * Pipes a request whilst sanitizing it
     */

    text(string: string): string {
        return escape(string)
    }

    escapeText(string: string): string {
        return sqlstring.escape(string)
    }

}