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
	fields?: string

	@IsOptional()
	@IsString()
	relations?: string
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
	sort?: string;

	//Filter params
	[key: string]: any
}

export class CreateOneQueryParams {}

export class UpdateOneQueryParams {}

export class DeleteOneQueryParams {}
