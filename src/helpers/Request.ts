import { Injectable } from '@nestjs/common'
import * as sqlstring from 'sqlstring'

@Injectable()
export class Request {
	constructor() {}

    sqlEscapeText(string: string): string {
        return sqlstring.escape(string)
    }

}