import { Injectable } from "@nestjs/common";
import { context, Logger } from "./Logger";
import { DatabaseSchema, DatabaseType, DatabaseWhere, WhereOperator } from "../types/database.types";
import { ConfigService } from "@nestjs/config";
import { MySQL } from "../databases/mysql.database";
import { ValidateResponse } from "src/types/schema.types";

@Injectable()
export class Schema {
	constructor(
		private readonly logger: Logger,
        private readonly configService: ConfigService,
        private readonly mysql: MySQL
	) {
		this.logger.setContext(context)
	}

    /**
	 * Get Table Schema
	 */

	async getSchema(table_name: string): Promise<DatabaseSchema> {
		try{
			switch(this.configService.get<string>('database.type')){
				case DatabaseType.MYSQL:
					return await this.mysql.getSchema(table_name)
				default:
					this.logger.error(`[Query][GetSchema] Database type ${this.configService.get<string>('database.type')} not supported yet`)
			}	
		}catch(e){
			this.logger.error(`[Query][GetSchema] ${e.message}`)
		}
	}

    /**
     * Create entity schema from database schema
     * @param schema
     */

    getTableName(schema: DatabaseSchema): string {
        return schema.table
    }

    /**
	 * The primary key's name of the table
	 */
	getPrimaryKey(schema: DatabaseSchema): string {
        return schema.columns.find(column => {
                    if (column.primary_key) {
                        return column
                    }
                }).field
	}
    
    validateColumnData(schema: DatabaseSchema, column: string, value: any): {valid: boolean, message?: string} {

        const col = schema.columns.find(col => col.field === column) 

        if(!col){
            return {
                valid: false,
                message: `Column ${column} not found in schema`
            }
        }

        if(col.type.includes('int')){
            if(isNaN(parseInt(value))){
                return {
                    valid: false, 
                    message: `Invalid integer ${value} for column ${col.field}`
                }
            }
        }

        else if(
            col.type.includes('varchar') || 
            col.type.includes('text') || 
            col.type.includes('char') || 
            col.type.includes('enum')
        ){
            if(typeof value !== 'string'){
                return {
                    valid: false,
                    message: `Invalid varchar ${value} for column ${col.field}`
                }
            }
        }

       else {
            console.error(`[validateColumnData] Column type ${col.type} not integrated`)
                return {
                    valid: false,
                    message: `System Erorr: Column type ${col.type} not integrated`
                }
       }

        return {
            valid: true
        }
    }
    
    validateFields(schema: DatabaseSchema, fields: string): ValidateResponse {

        const table_name = this.getTableName(schema)

        try{
            const array = fields.split(',').filter(field => !field.includes('.'))

            for(let field of array){
                if(!schema.columns.find((col) => col.field === field)){
                    return {
                        valid: false,
                        message: `Field ${field} not found in table schema for ${table_name}`
                    }
                }
            }
        
            return {
                valid: true,
                params: array
            }
        }catch(e){
            return {
                valid: false,
                message: `Error parsing fields ${fields}`
            }
        }
    }


    /**
     * Validate relations by ensuring that the relation exists in the schema
     */

    async validateRelations(schema: DatabaseSchema, relations: string): Promise<ValidateResponse> {

        const table_name = this.getTableName(schema)

       try{
            const array = relations.split(',')

            for(let relation of array){
                if(!schema.relations.find((col) => col.table === relation)){
                    return {
                        valid: false,
                        message: `Relation ${relation} not found in table schema for ${table_name} `
                    }
                }
                schema.relations.find((col) => col.table === relation).schema = await this.getSchema(relation)
            }
        
            return {
                valid: true,
                params: array,
                schema: schema
            }
        }catch(e){
            return {
                valid: false,
                message: `Error parsing relations ${relations}`
            }
        }
    
    }

    /**
     * Validate params for where builder, format is column[operator]=value with operator being from the enum WhereOperator 
     * 
     * Example: ?id[equals]=1&name=John&age[gte]=21
     */

    validateWhereParams(schema: DatabaseSchema, params: any): ValidateResponse {

        const where = []

        for(const param in params){

            let [column, operator] = param.split('[').filter(part => part !== '')
            if(!operator){
                operator = 'equals'
            }

            if(column.includes('.')){
                continue
            }

            const value = params[param]

            if(['fields', 'limit', 'offset[ASC]', 'order[DESC]', 'page', 'relations'].includes(column)){
                continue
            }
  
            if(!schema.columns.find(col => col.field === column)){
                return {
                    valid: false,
                    message: `Column ${column} not found in schema`
                }
            }

            if(!Object.values(WhereOperator).includes(WhereOperator[operator])){
                return {
                    valid: false,
                    message: `Operator ${operator} not found`
                }
            }

            const validation = this.validateColumnData(schema, column, value)

            if(!validation.valid){
                return validation
            }

            where.push({
                column,
                operator: WhereOperator[operator],
                value
            })
        }

        return {
            valid: true,
            where
        }
    }

    /**
     * Validate order params, format is order[direction]=column
     * 
     * Example: ?order[ASC]=name&order[DESC]=id&order[ASC]=content.title`
     */
    
    validateOrder(schema: DatabaseSchema, params: any): {valid: boolean, message?: string} {

        for(const param in params){

            if(param !== 'order[ASC]' && param !== 'order[DESC]') continue

            const [direction] = param.split('[').filter(part => part !== '')
            const value = params[param]

            if(!['ASC', 'DESC'].includes(direction)){
                return {
                    valid: false,
                    message: `Direction ${direction} not found`
                }
            }

            if(!schema.columns.find(col => col.field === value)){
                return {
                    valid: false,
                    message: `Column ${value} not found in schema`
                }
            }
        }

        return {
            valid: true
        }

    }
   

}