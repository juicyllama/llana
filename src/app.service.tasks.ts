import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'

import { DataCacheService } from './modules/cache/dataCache.service'
import { Webhook } from './helpers/Webhook'

let webhookSchedule: string = CronExpression.EVERY_30_SECONDS
let cacheSchedule: string = CronExpression.EVERY_MINUTE

@Injectable()
export class TasksService {
	constructor(
		private readonly configService: ConfigService,
		private readonly webhook: Webhook,
		private readonly dataCache: DataCacheService,
	) {
		webhookSchedule = (CronExpression[this.configService.get('CRON_EXPRESSION_WEBHOOKS_SEND')] ?? CronExpression.EVERY_30_SECONDS as CronExpression)
		cacheSchedule = (CronExpression[this.configService.get('CRON_EXPRESSION_CACHE_CHECK')] ?? CronExpression.EVERY_MINUTE as CronExpression)
	}

	@Cron(webhookSchedule)
	async sendWebhooks() {
		if (this.configService.get<boolean>('DISABLE_WEBHOOKS')) {
			return
		}

		const webhooks = await this.webhook.getPendingWebhooks()

		for (const webhook of webhooks) {
			await this.webhook.sendWebhook(webhook)
		}
	}

	@Cron(cacheSchedule)
	async checkCache() {
		await this.dataCache.refresh(cacheSchedule as CronExpression)
	}
}
