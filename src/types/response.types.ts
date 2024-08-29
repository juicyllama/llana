import { ApiProperty } from "@nestjs/swagger"

export type GetResponseObject = {
    
}

export type ListResponseObject = {

}


export class BulkUploadResponse {
	@ApiProperty({
		name: 'total',
		description: 'The total number of records to process',
		type: 'Number',
		required: true,
		example: 100,
	})
	total!: number

	@ApiProperty({
		name: 'processed',
		description: 'The total number of records processed',
		type: 'Number',
		required: true,
		example: 100,
	})
	processed!: number

	@ApiProperty({
		name: 'created',
		description: 'The total number of records created',
		type: 'Number',
		required: true,
		example: 80,
	})
	created!: number

	@ApiProperty({
		name: 'updated',
		description: 'The total number of records updated',
		type: 'Number',
		required: true,
		example: 20,
	})
	updated!: number

	@ApiProperty({
		name: 'deleted',
		description: 'The total number of records deleted',
		type: 'Number',
		required: true,
		example: 0,
	})
	deleted!: number

	@ApiProperty({
		name: 'errored',
		description: 'The total number of records errored',
		type: 'Number',
		required: true,
		example: 0,
	})
	errored!: number

	@ApiProperty({
		name: 'errors',
		description: 'The array of errors',
		type: 'Array',
		required: false,
		example: ['Error 1', 'Error 2'],
	})
	errors?: any[]

	@ApiProperty({
		name: 'ids',
		description: 'The primary keys of the records processed',
		type: 'Array',
		required: false,
		example: [1, 2, 3, 4],
	})
	ids!: number[]
}