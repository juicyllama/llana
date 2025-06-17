import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class RobotsMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  		return next()
	}
}
