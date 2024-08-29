import { WhereOperator } from "./database.types"

export interface AuthAPIKey extends Auth {
    column: string,
}

export interface AuthJWT extends Auth {
    columns: {
        email: string,
        password: string
    },
    password_encryption: AuthPasswordEncryption,
}

export interface Auth {
    table: string,
    where?: {
        column: string,
        operator: WhereOperator,
        value?: string
    }[],
}

export enum AuthPasswordEncryption {
    BCRYPT = "BCRYPT",
    SHA256 = "SHA256",
    SHA512 = "SHA512",
    MD5 = "MD5",
    ARGON2 = "ARGON2"
}

export enum RestrictionLocation {
    HEADER = "HEADER",
    QUERY = "QUERY",
    BODY = "BODY"
}