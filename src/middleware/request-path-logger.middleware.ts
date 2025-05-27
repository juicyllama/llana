import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

import { Logger } from '../helpers/Logger'

@Injectable()
export class RequestPathLoggerMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		const logger = new Logger()

		// Alphabetize query parameters for GET requests with query parameters
		if(req.method === 'GET' && Object.keys(req.query).length) {

			//get the request query parameters and put them in alphabetical order
			const queryParams = Object.keys(req.query)
				.sort()
				.map(key => `${key}=${req.query[key]}`)
			
			// Replace query parameters in the URL with sorted query parameters
			if (queryParams.length > 0) {
				const sortedQueryString = queryParams.join('&')
				req.originalUrl = req.originalUrl.split('?')[0] + '?' + sortedQueryString
			}

			logger.debug(`[RequestPathLoggerMiddleware] Request Path: ${req.originalUrl}`, {
				method: req.method,
				query: req.method === 'GET' ? {
					original: req.query,
					sorted: queryParams,
				} : undefined,
				body: req.method !== 'GET' ? req.body : undefined,
				final_url: req.originalUrl,
			})
		}

		next()
	}
}
