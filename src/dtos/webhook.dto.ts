import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean, IsDateString, IsDate } from 'class-validator'
import { Method } from '../types/response.types'
import { PublishType } from '../types/database.types'

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
	@IsDateString()
	created_at?: string

	@IsOptional()
	@IsDate()
	delivered_at?: Date
}