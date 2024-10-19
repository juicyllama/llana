import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Webhook } from './helpers/Webhook';

let webhookSchedule: string = CronExpression.EVERY_30_SECONDS;

@Injectable()
export class TasksService {

    constructor(
        private readonly configService: ConfigService,
        private readonly webhook: Webhook
    ) {
        webhookSchedule = this.configService.get('CRON_EXPRESSION_WEBHOOKS_SEND') ?? CronExpression.EVERY_30_SECONDS;
    }

    @Cron(webhookSchedule ?? CronExpression.EVERY_30_SECONDS)
    async sendWebhooks() {
        const webhooks = await this.webhook.getPendingWebhooks()
        
        for(const webhook of webhooks) {
            await this.webhook.sendWebhook(webhook)
        }
    }
}