import { DatabaseSchema, DatabaseWhere } from "./database.types";


export interface ValidateResponse {
    valid: boolean, 
    message?: string, 
    where?: DatabaseWhere[]
    params?: string[],
    schema?: DatabaseSchema
}

export interface SortCondition {
    column: string,
    operator: 'ASC' | 'DESC'
}