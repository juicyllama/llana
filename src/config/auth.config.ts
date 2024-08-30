import { registerAs } from '@nestjs/config'
import { AuthAPIKey, AuthJWT, AuthPasswordEncryption } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs('auth', () => ({
        api_key: <AuthAPIKey>{
        table: "users",
        column: "api_key",
        where: [{
            column: "deleted_at",
            operator: WhereOperator.IS_NULL,
        }]
    },
    jwt_token: <AuthJWT>{
        table: "users",
        columns: {email: "email", password: "password"},
        password_encryption: AuthPasswordEncryption.ARGON2,
        where: [{
            column: "deleted_at",
            operator: WhereOperator.IS_NULL,
        }]
    }   
}))