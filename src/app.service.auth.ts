import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { Encryption } from './helpers/Encryption'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Schema } from './helpers/Schema'
import { Auth, AuthJWT, AuthType } from './types/auth.types'
import { DataSourceSchema, DataSourceWhere, QueryPerform, WhereOperator } from './types/datasource.types'

@Injectable()
export class AuthService {
	constructor(
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async signIn(username: string, pass: string, x_request_id?: string): Promise<{ access_token: string; id: any }> {
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

		let schema: DataSourceSchema
		try {
			schema = await this.schema.getSchema({ table: jwtAuthConfig.table.name, x_request_id })
		} catch (e) {
			this.logger.error(e)
			throw new UnauthorizedException()
		}

		const where: DataSourceWhere[] = [
			{
				column: (jwtAuthConfig.table as AuthJWT).columns.username,
				operator: WhereOperator.equals,
				value: username,
			},
		]

		if (this.configService.get('database.deletes.soft')) {
			where.push({
				column: this.configService.get('database.deletes.soft'),
				operator: WhereOperator.null,
			})
		}

		const user = await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema,
				where,
			},
			x_request_id,
		)

		if (!user) {
			throw new UnauthorizedException()
		}

		try {
			if (
				!(await this.encryption.compare(
					pass,
					user[(jwtAuthConfig.table as AuthJWT).columns.password],
					(jwtAuthConfig.table as AuthJWT).password.encryption,
					(jwtAuthConfig.table as AuthJWT).password.salt,
				))
			) {
				throw new UnauthorizedException()
			}
		} catch (e) {
			this.logger.debug(e)
			throw new UnauthorizedException()
		}

		const userIdentifier = user[(jwtAuthConfig.table as AuthJWT).identity_column ?? schema.primary_key]

		this.logger.debug(`[Authentication][auth] User ${userIdentifier} authenticated successfully`)

		const payload = { sub: userIdentifier, username: user[(jwtAuthConfig.table as AuthJWT).columns.username] }

		return {
			access_token: await this.jwtService.signAsync(payload),
			id: userIdentifier,
		}
	}
}
