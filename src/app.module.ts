import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { DeleteController } from './app.controller.delete'
import { GetController } from './app.controller.get'
import { PostController } from './app.controller.post'
import { PutController } from './app.controller.put'
import { LoginService } from './app.service.login'
//@ts-expect-error file generated on install
import auth from './config/auth.config'
//@ts-expect-error file generated on install
import database from './config/database.config'
//@ts-expect-error file generated on install
import hosts from './config/hosts.config'
//@ts-expect-error file generated on install
import jwt from './config/jwt.config'
//@ts-expect-error file generated on install
import roles from './config/roles.config'
import { MySQL } from './databases/mysql.database'
import { Authentication } from './helpers/Authentication'
import { Encryption } from './helpers/Encryption'
import { Logger } from './helpers/Logger'
import { Pagination } from './helpers/Pagination'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Sort } from './helpers/Sort'
import { HostCheckMiddleware } from './middleware/HostCheck'

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [auth, database, hosts, jwt, roles],
		}),
		JwtModule.register(jwt()),
	],
	controllers: [DeleteController, GetController, PostController, PutController],
	providers: [
		Authentication,
		Encryption,
		Logger,
		LoginService,
		MySQL,
		Pagination,
		Query,
		Response,
		Roles,
		Schema,
		Sort,
	],
	exports: [
		Authentication,
		Encryption,
		Logger,
		LoginService,
		MySQL,
		Pagination,
		Query,
		Response,
		Roles,
		Schema,
		Sort,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(HostCheckMiddleware).forRoutes('*')
	}
}
