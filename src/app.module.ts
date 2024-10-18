import { CacheModule } from '@nestjs/cache-manager'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './app.controller.auth'
import { DeleteController } from './app.controller.delete'
import { DocsController } from './app.controller.docs'
import { GetController } from './app.controller.get'
import { PostController } from './app.controller.post'
import { PutController } from './app.controller.put'
import { AuthService } from './app.service.auth'
import { AppBootup } from './app.service.bootup'
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { Mongo } from './databases/mongo.database'
import { MySQL } from './databases/mysql.database'
import { Postgres } from './databases/postgres.database'
import { Authentication } from './helpers/Authentication'
import { Documentation } from './helpers/Documentation'
import { Encryption } from './helpers/Encryption'
import { Logger } from './helpers/Logger'
import { Pagination } from './helpers/Pagination'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Websocket } from './helpers/Websocket'
import { HostCheckMiddleware } from './middleware/HostCheck'
import { Webhook } from './helpers/Webhook'

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [auth, database, hosts, jwt, roles],
		}),
		JwtModule.register(jwt()),
		CacheModule.register({
			isGlobal: true,
		}),
	],
	controllers: [AuthController, DocsController, DeleteController, GetController, PostController, PutController],
	providers: [
		AppBootup,
		AuthService,
		Authentication,
		Documentation,
		Encryption,
		HostCheckMiddleware,
		Logger,
		Mongo,
		MySQL,
		Pagination,
		Postgres,
		Query,
		Response,
		Roles,
		Schema,
		Websocket,
		Webhook,
	],
	exports: [
		AppBootup,
		AuthService,
		Authentication,
		Documentation,
		Encryption,
		HostCheckMiddleware,
		Logger,
		Mongo,
		MySQL,
		Pagination,
		Postgres,
		Query,
		Response,
		Roles,
		Schema,
		Websocket,
		Webhook,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(HostCheckMiddleware).forRoutes('*')
	}
}
