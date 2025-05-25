import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

import { Logger } from '../helpers/Logger'

@Injectable()
export class RequestPathLoggerMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		const logger = new Logger()
		logger.debug(`[RequestPathLoggerMiddleware] Request Path: ${decodeURI(req.originalUrl)}`)
		next()
	}
}
