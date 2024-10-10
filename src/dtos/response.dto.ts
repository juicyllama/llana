import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator'

export class PaginationPage {
	@IsString()
	current: string

	@IsOptional()
	@IsString()
	prev?: string

	@IsOptional()
	@IsString()
	next?: string

	@IsOptional()
	@IsString()
	first?: string

	@IsOptional()
	@IsString()
	last?: string
}

export class Pagination {
	@IsObject()
	page: PaginationPage

	@IsNumber()
	total: number
}

export class FindOneResponseObject {
	[key: string]: any
}

export class FindManyResponseObject {
	@IsNumber()
	offset: number

	@IsNumber()
	limit: number

	@IsNumber()
	total: number

	@IsObject()
	pagination: Pagination

	@IsArray()
	data: FindOneResponseObject[]

	@IsOptional()
	@IsString()
	_x_request_id?: string
}

export class IsUniqueResponse {
	@IsBoolean()
	valid: boolean

	@IsOptional()
	@IsString()
	message?: string

	@IsOptional()
	@IsString()
	_x_request_id?: string
}

export class DeleteResponseObject {
	@IsNumber()
	deleted: number

	@IsOptional()
	@IsString()
	_x_request_id?: string
}

export class ListTablesResponseObject {
	@IsArray()
	tables: string[]

	@IsOptional()
	@IsString()
	_x_request_id?: string
}

export class CreateResponseError {

	@IsNumber()
	item: number

	@IsString()
	message: string
}

export class CreateManyResponseObject {
	
	@IsNumber()
	total: number

	@IsNumber()
	successful: number

	@IsNumber()
	errored: number

	@IsOptional()
	@IsObject()
	errors?: CreateResponseError[]

	@IsArray()
	data: FindOneResponseObject[]

	@IsOptional()
	@IsString()
	_x_request_id?: string
}