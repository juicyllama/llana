import { Injectable, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NextFunction, Request, Response } from 'express'

import { Logger } from '../helpers/Logger'
import { Env } from '../utils/Env'

@Injectable()
export class HostCheckMiddleware implements NestMiddleware {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
	) {}

	use(req: Request, res: Response, next: NextFunction) {
		if (this.validateHost(req.headers, 'HTTP')) {
			next()
		} else {
			res.status(403).send('Forbidden')
			return
		}
	}

	/**
	 * Validate host
	 *
	 * Returns true if host is allowed, false if not
	 */

	validateHost(headers: any, domain?: string): boolean {
		let ip = headers['x-real-ip']
		if (!ip) ip = headers['x-forwarded-for']
		if (!ip) ip = headers['address']

		if (!ip) {
			this.logger.debug(`${domain ? domain + ' ' : ''}No IP found`)
		} else {
			this.logger.debug(`${domain ? domain + ' ' : ''}Client connecting from ${ip}`)
		}

		let allowed_hosts = this.configService.get<string>('HOSTS')?.split(',') ?? []

		//remove blank entries e.g. [""] -> []
		allowed_hosts = allowed_hosts.filter((host) => host)
	
		
		if (allowed_hosts.length === 0) {
			return true
		}

		if (Env.IsTest()) {
			if (allowed_hosts.includes('localhost')) {
				return true
			}
		}

		for (const host of allowed_hosts) {
			if (ip === host) {
				return true
			}
		}

		if (Env.IsDev()) {
			this.logger.warn(
				`${domain ? domain + ' ' : ''}Host not in approved list, skipping forbidden response as in dev mode`,
				{
					host: ip,
					allowed_hosts,
				},
			)
			return true
		} else {
			this.logger.debug(`${domain ? domain + ' ' : ''}Host not in approved list, returning forbidden response`, {
				host: ip,
				allowed_hosts,
				headers,
			})
			return false
		}
	}
}
