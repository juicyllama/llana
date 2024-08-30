import 'dotenv/config'
import { DatabaseNaming } from '../types/database.types'
import { getDatabaseType } from '../helpers/Database'
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    type: getDatabaseType(process.env.DATABASE_URI),
    host: process.env.DATABASE_URI,
    naming: DatabaseNaming.SNAKE_CASE,
    defaults: {
        limit: 20,
        relations: {
            limit: 20,
        }
    }
}));