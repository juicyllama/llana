import { registerAs } from '@nestjs/config'
import { AuthAPIKey, AuthJWT, AuthPasswordEncryption } from '../types/auth.types'
import { WhereOperator } from '../types/database.types'

export default registerAs('auth', () => ({
    api_key: <AuthAPIKey>{
        table: "users",
        column: "api_key",
        identity_column: "id",
        where: [{
            column: "deleted_at",
            operator: WhereOperator.null,
        }]
    },
    jwt_token: <AuthJWT>{
        table: "users",
        columns: {email: "email", password: "password"},
        identity_column: "id",
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