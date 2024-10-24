import { IsBoolean, IsDate, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

import { PublishType } from '../types/database.types'
import { Method } from '../types/response.types'

export class Webhook {
	@IsNumber()
	id: number

	@IsEnum(Method)
	type: Method

	@IsString()
	url: string

	@IsString()
	table: string

	@IsOptional()
	@IsBoolean()
	on_create?: boolean

	@IsOptional()
	@IsBoolean()
	on_update?: boolean

	@IsOptional()
	@IsBoolean()
	on_delete?: boolean
}

export class WebhookLog {
	@IsNumber()
	id: number

	@IsNumber()
	webhook_id: number

	@IsEnum(PublishType)
	type: PublishType

	@IsString()
	url: string

	@IsString()
	record_key: string

	@IsNumber()
	record_id: number

	@IsNumber()
	response_status: number

	@IsString()
	response_message: string

	@IsOptional()
	@IsBoolean()
	delivered?: boolean

	@IsOptional()
	@IsNumber()
	attempt: number

	@IsOptional()
	@IsDateString()
	created_at?: Date

	@IsOptional()
	@IsDate()
	delivered_at?: Date

	@IsOptional()
	@IsDate()
	next_attempt_at?: Date
}
