import { Injectable } from '@nestjs/common'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { QueryPerform } from '../types/database.types'
import { FindOneResponseObject } from '../types/response.types'

export const CUSTOMER = {
    companyName: 'Customer AAAAA',
    contactName: 'Doe, Jon',
    contactTitle: 'Owner',
    address: '1234 Elm St',
    city: 'Springfield',
    region: 'IL',
    postalCode: '62701',
    country: 'USA',
}

@Injectable()
export class CustomerTestingService {
    constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

    async createCustomer(customer: any): Promise<any> {
        const customerTableSchema = await this.schema.getSchema('Customer')
        
        return (await this.query.perform(QueryPerform.CREATE, {
            schema: customerTableSchema,
            data: {
                ...CUSTOMER,
                ...customer,
            },
        })) as FindOneResponseObject
    }

}