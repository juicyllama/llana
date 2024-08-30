import * as mysql from 'mysql2/promise';
import { Connection } from 'mysql2/promise';
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { context, Logger } from '../helpers/Logger'
import { DatabaseFindByIdOptions, DatabaseFindManyOptions, DatabaseFindOneOptions, DatabaseSchema, DatabaseSchemaColumn, DatabaseWhere } from '../types/database.types';
import { ListResponseObject } from '../types/response.types';

@Injectable()
export class MySQL {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
	) {
		this.logger.setContext(context)
	}

    /**
     * Create a MySQL connection
     */
    async createConnection(): Promise<Connection> {
        if (!mysql) {
            throw new Error('MySQL library is not initialized');
        } 
        return await mysql.createConnection(this.configService.get('database.host'))
    }

    async performQuery(query: string): Promise<any> {
        const connection = await this.createConnection()
        try{
            const [results] = await connection.query<any[]>(query)
            return results
        }catch(e){
            this.logger.error('Error executing mysql database query')
            this.logger.error({
                sql: query,
                error: {
                    message: e.message
                }
            })
        }
       
    }

    /**
     * Get Table Schema
     * @param repository
     * @param table_name
     */

    async getSchema(table_name: string): Promise<DatabaseSchema> {

        const columns_result = await this.performQuery(`DESCRIBE ${table_name}`)

        const columns = columns_result.map((column: any) => {
            return <DatabaseSchemaColumn>{
                field: column.Field,
                type: column.Type,
                nullable: column.Null === 'YES',
                required: column.Null === 'NO',
                primary_key: column.Key === 'PRI',
                unique_key: column.Key === 'UNI',
                foreign_key: column.Key === 'MUL',
                default: column.Default,
                extra: column.Extra,
            };
        });
       
        const relations_result = await this.performQuery(`SELECT TABLE_NAME as 'table',COLUMN_NAME as 'column',CONSTRAINT_NAME as 'key' FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = '${table_name}'`)
        
        const relations = relations_result.filter((row: any) => row.table !== null).map((row: any) => ({
            table: row.table,
            column: row.column,
            key: row.key,
        }));

        return {
            table: table_name,
            primary_key: columns.find(column => column.primary_key).field,
            columns,
            relations,
        };
    }

    /**
     * Find record by primary key id
     */

	async findById(options: DatabaseFindByIdOptions, table_name: string, primary_key: string): Promise<any> {

        const fields = options.fields?.split(',').filter(field => !field.includes('.'))

		let command = `SELECT ${table_name}.${fields?.length ? fields.join(`, ${table_name}.`) : '*'} FROM ${table_name} `
		command += `WHERE ${primary_key} = ${options.id} LIMIT 1`

        const results = await this.performQuery(command)
		return await this.addRelations(options, results[0])
	}	

	/**
	 * Find single record
	 */

	async findOne(options: DatabaseFindOneOptions): Promise<any> {

        const table_name = options.schema.table

        const fields = options.fields?.split(',').filter(field => !field.includes('.'))

        const where = options.where?.filter(where => !where.column.includes('.'))
    
		let command = `SELECT ${table_name}.${fields?.length ? fields.join(`, ${table_name}.`) : '*'} `
        command += `FROM ${table_name} `

        if(where?.length){
            command += `WHERE ${where.map(w => `${w.column} ${w.operator} ${w.value ? `'`+ w.value +`'` : ''}`).join(' AND ')} `
        }
        
        command += ` LIMIT 1`

        const results = await this.performQuery(command)
		return await this.addRelations(options, results[0])
	}	

    /**
	 * Find multiple records
	 */

	async findMany(options: DatabaseFindManyOptions): Promise<ListResponseObject> {

        const table_name = options.schema.table

        const fields = options.fields?.split(',').filter(field => !field.includes('.'))

		let command = `SELECT ${table_name}.${fields?.length ? fields.join(`, ${table_name}.`) : '*'} FROM ${table_name} `
		
        if(options.where?.length){
            command += `WHERE ${options.where.map(where => `${where.column} ${where.operator} ${where.value ? `'`+ where.value +`'` : ''}`).join(' AND ')} `
        }

        command += ` LIMIT 1`

        const results = await this.performQuery(command)
		return await this.addRelations(options, results[0])
	}	

	
    async addRelations(options: DatabaseFindByIdOptions | DatabaseFindOneOptions | DatabaseFindManyOptions, result: any): Promise<any> {

        if(!result) return {}

		if(options.relations?.split(',').length){

            const primary_key_id = result[options.schema.columns.find(column => column.primary_key).field]

			for(const relation of options.relations.split(',')){
				const schema_relation = options.schema.relations.find(r => r.table === relation)
				const primary_key_relation = options.schema.columns.find(column => column.primary_key).field
				const fields = options.fields?.split(',').filter(field => field.includes(schema_relation.table+'.'))
                
                let where: DatabaseWhere[] = [];
                if ('where' in options && options.where) {
                  where = options.where.filter(where => where.column.includes(schema_relation.table + '.'));
                }

                // TODO: move to findMany function
          
				let command = `SELECT ${fields?.length ? fields.join(`, `) : '*'} FROM ${relation} `
				command += `WHERE ${schema_relation.column} = ${primary_key_id} `
                
                if(where?.length){
                    command += `AND ${where.map(w => `${w.column} ${w.operator} ${w.value ? `'`+ w.value +`'` : ''}`).join(' AND ')} `
                }

                command += `ORDER BY ${primary_key_relation} DESC LIMIT ${this.configService.get<string>('database.defaults.relations.limit')} OFFSET 0 `
		
                const relation_result = await this.performQuery(command)
                result[relation] = relation_result 
			}
		}
		return result
	}

}