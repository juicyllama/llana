import { DataSourceType } from './types/datasource.types'

export const NON_FIELD_PARAMS = ['fields', 'limit', 'offset', 'sort', 'page', 'relations', 'join']
export const LLANA_PUBLIC_TABLES = '_llana_public_tables'
export const LLANA_ROLES_TABLE = '_llana_role'
export const LLANA_RELATION_TABLE = '_llana_relation'
export const LLANA_WEBHOOK_TABLE = '_llana_webhook'
export const LLANA_WEBHOOK_LOG_TABLE = '_llana_webhook_log'
export const LLANA_DATA_CACHING_TABLE = '_llana_data_caching'
export const APP_BOOT_CONTEXT = 'AppBootup'
export const CACHE_DEFAULT_TABLE_SCHEMA_TTL = 3600000 // 1 hour
export const CACHE_DEFAULT_IDENTITY_DATA_TTL = 600000 // 10 minutes
export const CACHE_DEFAULT_WS_IDENTITY_DATA_TTL = 3600000 * 24 * 2 // 2 days
export const CACHE_DEFAULT_WEBHOOK_TTL = 3600000 * 24 * 2 // 2 days
export const WEBHOOK_LOG_DAYS = 1
export const NON_RELATIONAL_DBS = [DataSourceType.MONGODB]
