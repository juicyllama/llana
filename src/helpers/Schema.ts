import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { context, Logger } from "./Logger";
import { DatabaseType, MySQLSchema } from "../types/database.types";
@Injectable()
export class Schema {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger
	) {
		this.logger.setContext(context)
	}

    /**
     * Create entity schema from database schema
     * @param schema
     */

    getTableName(schema: MySQLSchema): string {

		switch(this.configService.get<string>('database.type')){
			case DatabaseType.MYSQL:
                return schema.table    

			default:
				this.logger.error(`[Schema][reate] Database type ${this.configService.get<string>('database.type')} not supported`)
                return null
		}	
	}

    /**
	 * The primary key's name of the table
	 */
	getPrimaryKey(schema: MySQLSchema): string {

        switch(this.configService.get<string>('database.type')){
			case DatabaseType.MYSQL:
                
                return schema.columns.find(column => {
                    if (column.Key === 'PRI') {
                        return column
                    }
                }).Field

			default:
				this.logger.error(`[Schema][reate] Database type ${this.configService.get<string>('database.type')} not supported`)
                return null
	    }
    }

    validateColumnData(schema: MySQLSchema, column: string, value: any): {valid: boolean, message?: string} {

        const col = schema.columns.find(col => col.Field === column)

        if(!col){
            return {
                valid: false,
                message: `Column ${column} not found in schema`
            }
        }

        if(col.Type.includes('int')){
            if(isNaN(parseInt(value))){
                return {
                    valid: false, 
                    message: `Invalid integer ${value} for column ${col.Field}`
                }
            }
        }

        else if(col.Type.includes('varchar')){
            if(typeof value !== 'string'){
                return {
                    valid: false,
                    message: `Invalid varchar ${value} for column ${col.Field}`
                }
            }
        }

       else {

            console.error(`[validateColumnData] Column type ${schema.columns[column].type} not integrated`)
                return {
                    valid: false,
                    message: 'System Erorr: Column type not integrated'
                }

       }

        return {
            valid: true
        }
    }
    
    validateFields(schema: MySQLSchema, fields: string): {valid: boolean, message?: string, data?: string[]} {

        const table_name = this.getTableName(schema)

        try{
            const array = fields.split(',').filter(field => !field.includes('.'))

            for(let field of array){
                if(!schema.columns.find((col) => col.Field === field)){
                    return {
                        valid: false,
                        message: `Field ${field} not found in table schema for ${table_name}`
                    }
                }
            }
        
            return {
                valid: true,
                data: array
            }
        }catch(e){
            return {
                valid: false,
                message: `Error parsing fields ${fields}`
            }
        }
    }

    validateRelations(schema: MySQLSchema, relations: string): {valid: boolean, message?: string, data?: string[]} {

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
            }
        
            return {
                valid: true,
                data: array
            }
        }catch(e){
            return {
                valid: false,
                message: `Error parsing relations ${relations}`
            }
        }
    
    }


}