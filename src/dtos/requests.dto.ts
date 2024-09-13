import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class HeaderParams {
	@IsOptional()
	@IsString()
	Authorization?: string

	@IsOptional()
	@IsString()
	'x-request-id'?: string;

	//Api key
	[key: string]: any
}

export class FindQueryParams {
	@IsOptional()
	@IsString()
	@Transform(({ value }) => value.toString().split(','))
	fields?: string[]

	@IsOptional()
	@IsString()
	@Transform(({ value }) => value.toString().split(','))
	relations?: string[]
}

export class FindOneQueryParams extends FindQueryParams {}

export class FindManyQueryParams extends FindQueryParams {
	@IsOptional()
	@IsNumber()
	limit?: number

	@IsOptional()
	@IsNumber()
	offset?: number

	@IsOptional()
	@IsString()
	page?: string

	@IsOptional()
	@IsString()
	@Transform(({ value }) => value.toString().split(','))
	sort?: string[];

	//Filter params
	[key: string]: any
}

export class CreateOneQueryParams {}

export class UpdateOneQueryParams {}

export class DeleteOneQueryParams {}
