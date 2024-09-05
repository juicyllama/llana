import { Env } from '../utils/Env'
import { Injectable, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NextFunction, Request, Response } from 'express'

import { Logger } from '../helpers/Logger'

@Injectable()
export class HostCheckMiddleware implements NestMiddleware {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
	) {}

	use(req: Request, res: Response, next: NextFunction) {
		const allowed_hosts = this.configService.get<string[]>('hosts') || []

		if (allowed_hosts.length === 0) {
			return next()
		}

		if (Env.IsTest()) {
			if (allowed_hosts.includes('localhost')) {
				return next()
			}
		}

		for (const host of allowed_hosts) {
			if (req.get('host') === host) {
				return next()
			}
		}

		if (Env.IsDev()) {
			this.logger.warn(`Host not in approved list, skipping forbidden response as in dev mode`, {
				host: req.get('host'),
				allowed_hosts,
			})
			return next()
		} else {
			this.logger.debug(`Host not in approved list, returning forbidden response`, {
				host: req.get('host'),
				allowed_hosts,
			})
			res.status(403).send('Forbidden')
			return
		}
	}
}
