import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { Authentication } from './helpers/Authentication'
import { ConfigModule } from '@nestjs/config'
import { Encryption } from './helpers/Encryption'
import { FindService } from './app.service.find'
import { GetController } from './app.controller.get'
import { HostCheckMiddleware } from './middleware/HostCheck'
import { JwtModule } from '@nestjs/jwt'
import { Logger } from './helpers/Logger'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { MySQL } from './databases/mysql.database'
import { Pagination } from './helpers/Pagination'
import { Query } from './helpers/Query'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Sort } from './helpers/Sort'
import { LoginService } from './app.service.login'
import { PostController } from './app.controller.post'

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [auth, database, hosts, jwt, roles],
		}),
		JwtModule.register(jwt()),
	],
	controllers: [GetController, PostController],
	providers: [
		Authentication,
		Encryption,
		FindService,
		Logger,
		LoginService,
		MySQL,
		Pagination,
		Query,
		Roles,
		Schema,
		Sort,
	],
	exports: [
		Authentication,
		Encryption,
		FindService,
		Logger,
		LoginService,
		MySQL,
		Pagination,
		Query,
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
