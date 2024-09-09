import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { DeleteController } from './app.controller.delete'
import { GetController } from './app.controller.get'
import { PostController } from './app.controller.post'
import { PutController } from './app.controller.put'
import { AppBootup } from './app.service.bootup'
import { LoginService } from './app.service.login'
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
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
		AppBootup,
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
