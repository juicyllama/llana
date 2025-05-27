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
				.flatMap(key => {
					const value = req.query[key]
					if (Array.isArray(value)) {
						return value.map(v => `${key}=${(v as string)}`)
					}
					return [`${key}=${(value as string)}`]
				})
			
			// Replace query parameters in the URL with sorted query parameters
			if (queryParams.length > 0) {
				const sortedQueryString = queryParams.join('&')
				req.originalUrl = decodeURI(req.originalUrl.split('?')[0] + '?' + sortedQueryString)
			}

			logger.debug(`[RequestPathLoggerMiddleware] ${req.method}: ${req.originalUrl}`, {
				query: {
					original: req.query,
					sorted: queryParams,
				},
				body: req.body,
				final_url: req.originalUrl,
			})
		}else{
			logger.debug(`[RequestPathLoggerMiddleware] ${req.method}: ${req.originalUrl}`)
		}

		next()
	}
}
