import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Query } from './helpers/Query'
import { ConfigService } from '@nestjs/config'
import { Logger } from './helpers/Logger'
import { Auth, AuthJWT, AuthType } from './types/auth.types'
import { Schema } from './helpers/Schema'
import { DatabaseSchema, WhereOperator } from './types/database.types'
import { Encryption } from './helpers/Encryption'

@Injectable()
export class LoginService {
	constructor(
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async signIn(username: string, pass: string): Promise<{ access_token: string }> {
		if (!username) {
			throw new BadRequestException('Username is required')
		}

		if (!pass) {
			throw new BadRequestException('Password is required')
		}

		const authentications = this.configService.get<Auth[]>('auth')

		const jwtAuthConfig = authentications.find(auth => auth.type === AuthType.JWT)

		if (!jwtAuthConfig) {
			this.logger.error('JWT authentication not configured')
			throw new UnauthorizedException()
		}

		let schema: DatabaseSchema
		try {
			schema = await this.schema.getSchema(jwtAuthConfig.table.name)
		} catch (e) {
			this.logger.error(e)
			throw new UnauthorizedException()
		}

		const user = await this.query.findOne({
			schema,
			where: [
				{
					column: (jwtAuthConfig.table as AuthJWT).columns.username,
					operator: WhereOperator.equals,
					value: username,
				},
			],
		})

		if (!user) {
			throw new UnauthorizedException()
		}

		let passwordEncyrpted

		try {
			passwordEncyrpted = await this.encryption.encrypt(
				(jwtAuthConfig.table as AuthJWT).password.encryption,
				pass,
				(jwtAuthConfig.table as AuthJWT).password.salt,
			)
		} catch (e) {
			this.logger.error(e)
			throw new UnauthorizedException()
		}

		if (passwordEncyrpted !== user[(jwtAuthConfig.table as AuthJWT).columns.password])
			throw new UnauthorizedException()

		const userIdentifier = user[(jwtAuthConfig.table as AuthJWT).identity_column ?? schema.primary_key]

		this.logger.debug(`[Authentication][auth] User ${userIdentifier} authenticated successfully`)

		const payload = { sub: userIdentifier, username: user[(jwtAuthConfig.table as AuthJWT).columns.username] }

		return {
			access_token: await this.jwtService.signAsync(payload),
		}
	}
}
