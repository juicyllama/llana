import { Env } from '@juicyllama/utils'
import { Injectable, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../helpers/Logger';

@Injectable()
export class HostCheckMiddleware implements NestMiddleware {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
	) {}

	use(req: Request, res: Response, next: NextFunction) {

		const allowed_hosts = this.configService.get<string[]>('hosts') || []

		if(allowed_hosts.length === 0){
			return next()
		}

		for (const host of allowed_hosts) {
			if (req.get('host') === host) {
				return next()
			}
		}

		if (Env.IsDev()) {
			this.logger.warn(`Host not in approved list, skipping forbidden response as in dev mode`, { host: req.get('host'), allowed_hosts })
			return next()
		}else{
			res.status(403).send('Forbidden')
			return next()
		}
		 
	}
}