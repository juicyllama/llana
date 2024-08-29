import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { context, Logger } from "./Logger";
import { DatabaseType, MySQLSchemaObject } from "../types/database.types";
import { EntitySchema, EntitySchemaColumnOptions } from "typeorm";

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

    create(table_name: string, schema: MySQLSchemaObject[]): EntitySchema<unknown> {

		switch(this.configService.get<string>('database.type')){
			case DatabaseType.MYSQL:
               return new EntitySchema({
                    name: table_name,
                    columns: schema.map(column => {
                        return <EntitySchemaColumnOptions>{
                            name: column.Field,
                            type: column.Type,
                            primary: column.Key === 'PRI',
                            nullable: column.Null === 'YES',
                            default: column.Default,
                            generated: column.Extra === 'auto_increment'
                        }}),
                        // relations: {
                        //     categories: {
                        //         type: "many-to-many",
                        //         target: "category", // CategoryEntity
                        //     },
                        // },
                        // checks: [
                        //     { expression: `"firstName" <> 'John' AND "lastName" <> 'Doe'` },
                        //     { expression: `"age" > 18` },
                        // ],
                        // indices: [
                        //     {
                        //         name: "IDX_TEST",
                        //         unique: true,
                        //         columns: ["firstName", "lastName"],
                        //     },
                        // ],
                        // uniques: [
                        //     {
                        //         name: "UNIQUE_TEST",
                        //         columns: ["firstName", "lastName"],
                        //     },
                        // ],
                })
        
			default:
				this.logger.error(`[Schema][reate] Database type ${this.configService.get<string>('database.type')} not supported`)
                return null
		}	
	}

}