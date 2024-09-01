import { registerAs } from '@nestjs/config'
import { AuthAPIKey, AuthJWT, AuthPasswordEncryption } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs('auth', () => ({
    api_key: <AuthAPIKey>{
        table: "users",
        column: "users_api_keys.api_key",
        where: [{
            column: "deleted_at",
            operator: WhereOperator.null,
        }]
    },
    jwt_token: <AuthJWT>{
        table: "users",
        columns: {email: "email", password: "password"},
        password: {
            encryption: AuthPasswordEncryption.SHA512,
            salt: null,
        },
        where: [{
            column: "deleted_at",
            operator: WhereOperator.null,
        }]
    }   
}))