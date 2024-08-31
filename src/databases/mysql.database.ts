import * as mysql from 'mysql2/promise';
import { Connection } from 'mysql2/promise';
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { context, Logger } from '../helpers/Logger'
import { DatabaseFindByIdOptions, DatabaseFindManyOptions, DatabaseFindOneOptions, DatabaseFindTotalRecords, DatabaseSchema, DatabaseSchemaColumn, DatabaseWhere, WhereOperator } from '../types/database.types';
import { ListResponseObject } from '../types/response.types';
import { Pagination } from '../helpers/Pagination';
import { SortCondition } from 'src/types/schema.types';

@Injectable()
export class MySQL {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
        private readonly pagination: Pagination
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

        console.log(options)


        const table_name = options.schema.table

        const total = await this.findTotalRecords(options)

        const fields = options.fields?.split(',').filter(field => !field.includes('.'))

		let command = `SELECT ${table_name}.${fields?.length ? fields.join(`, ${table_name}.`) : '*'} FROM ${table_name} `

        const where = options.where?.filter(where => !where.column.includes('.'))
		
        if(where?.length){
            command += `WHERE ${where.map(where => `${where.column} ${where.operator} ${where.value ? `'`+ where.value +`'` : ''}`).join(' AND ')} `
        }

        const sort = options.sort.filter(sort => !sort.column.includes('.'))

        if(sort?.length){
            command += `ORDER BY ${sort.map(sort => `${sort.column} ${sort.operator}`).join(', ')}`            
        }

        command += ` LIMIT ${options.limit} OFFSET ${options.offset}`

        let results = await this.performQuery(command)

        for(const r in results){
		    results[r] = await this.addRelations(options, results[r])
        }

        return {
            limit: options.limit,
            offset: options.offset,
            total,
            pagination: {
                total: results.length,
                page: {
                    current: this.pagination.current(options.limit, options.offset),
                    prev: this.pagination.previous(options.limit, options.offset),
                    next: this.pagination.next(options.limit, options.offset, total),
                    first: this.pagination.first(options.limit),
                    last: this.pagination.last(options.limit, total),
                }
            },
            data: results,
        }  

	}	

    /**
     * Get total records with where conditions
     */

    async findTotalRecords(options: DatabaseFindTotalRecords): Promise<number> {

        const table_name = options.schema.table

        let command = `SELECT COUNT(*) as total FROM ${table_name} `

        const where = options.where?.filter(where => !where.column.includes('.'))
 
        if(where?.length){
            command += `WHERE ${where.map(where => `${where.column} ${where.operator} ${where.value ? `'`+ where.value +`'` : ''}`).join(' AND ')} `
        }

        const results = await this.performQuery(command)
        return results[0].total
    }



	
    async addRelations(options: DatabaseFindByIdOptions | DatabaseFindOneOptions | DatabaseFindManyOptions, result: any): Promise<any> {

        if(!result) return {}

		if(options.relations?.split(',').length){

            const primary_key_id = result[options.schema.columns.find(column => column.primary_key).field]

			for(const relation of options.relations.split(',')){
				const schema_relation = options.schema.relations.find(r => r.table === relation).schema
                const relation_table = options.schema.relations.find(r => r.table === relation)
				const fields = options.fields?.split(',').filter(field => field.includes(schema_relation.table+'.'))
                
                if(fields.length){
                    // Remove table name from fields
                    fields.forEach((field, index) => {
                        fields[index] = field.replace(`${schema_relation.table}.`, '')
                    })
                }

                if(!fields.length){
                    fields.push(...schema_relation.columns.map(column => column.field))
                }
                
                const limit = this.configService.get<number>('database.defaults.relations.limit')
            
                let where: DatabaseWhere[] = [{
                    column: relation_table.column, 
                    operator: WhereOperator.equals,
                    value: primary_key_id
                }]
                
                if ('where' in options && options.where) {

                    where = where.concat(options.where.filter(where => where.column.includes(schema_relation.table + '.')))
                    
                    for(const w of where){
                        w.column = w.column.replace(`${schema_relation.table}.`, '')
                    }
                }

                let sort: SortCondition[] = [];
                if ('sort' in options && options.sort) {
                    sort = options.sort.filter(sort => sort.column.includes(schema_relation.table + '.'))
                    for(const s of sort){
                        s.column = s.column.replace(`${schema_relation.table}.`, '')
                    }
                }

                this.logger.debug(`[Query][Find][Many][${options.schema.table}][Relation][${relation}]`, {
                    fields: fields.join(','),
                    where,
                    sort,
                    limit,
                    offset: 0
                })
                
                const relation_result = await this.findMany({
                    schema: schema_relation,
                    fields: fields.join(','),
                    where,
                    sort,
                    limit,
                    offset: 0
                })

                console.log(relation_result)
				
                result[relation] = relation_result.data
			}
		}
		return result
	}

}