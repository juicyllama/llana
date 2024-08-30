import { Injectable } from "@nestjs/common";
import { context, Logger } from "./Logger";
import { DatabaseSchema, DatabaseType } from "../types/database.types";
import { ConfigService } from "@nestjs/config";
import { MySQL } from "../databases/mysql.database";

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

        else if(col.type.includes('varchar')){
            if(typeof value !== 'string'){
                return {
                    valid: false,
                    message: `Invalid varchar ${value} for column ${col.field}`
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
    
    validateFields(schema: DatabaseSchema, fields: string): {valid: boolean, message?: string, data?: string[]} {

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
                data: array
            }
        }catch(e){
            return {
                valid: false,
                message: `Error parsing fields ${fields}`
            }
        }
    }

    validateRelations(schema: DatabaseSchema, relations: string): {valid: boolean, message?: string, data?: string[]} {

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