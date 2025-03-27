import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { Strategy } from 'passport-local'
import { Encryption } from 'src/helpers/Encryption'
import { DataSourceSchema, DataSourceWhere, QueryPerform, WhereOperator } from 'src/types/datasource.types'

import { Logger } from '../../helpers/Logger'
import { Query } from '../../helpers/Query'
import { Schema } from '../../helpers/Schema'
import { Auth, AuthJWT, AuthType } from '../../types/auth.types'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {
		super({ usernameField: 'username', passReqToCallback: true })
	}

	async validate(req: Request, username: string, pass: string): Promise<any> {
		const x_request_id = req.headers['x-request-id'] as string

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
				await this.encryption.compare(
					pass,
					user[(jwtAuthConfig.table as AuthJWT).columns.password],
					(jwtAuthConfig.table as AuthJWT).password.encryption,
					(jwtAuthConfig.table as AuthJWT).password.salt,
				)
			) {
				return user
			}
			throw new UnauthorizedException()
		} catch (e) {
			this.logger.debug(e)
			throw new UnauthorizedException()
		}
	}
}
