import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GetController } from './app.controller.get'
import { FindService } from './app.service.find'
import { Query } from './helpers/Query'
import { Logger } from './helpers/Logger'
import { Schema } from './helpers/Schema'
import { Authentication } from './helpers/Authentication'
import { Roles } from './helpers/Roles'
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import roles from './config/roles.config'
import { MySQL } from './databases/mysql.database'
import { Pagination } from './helpers/Pagination'
import { Sort } from './helpers/Sort'
import { HostCheckMiddleware } from './middleware/HostCheck'

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [auth, database, hosts, roles],
		}),
	],
	controllers: [GetController],
	providers: [FindService, Authentication, Roles, Query, Schema, Pagination, Logger, Sort, MySQL],
	exports: [FindService, Authentication, Roles, Query, Schema, Pagination, Logger, Sort, MySQL],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(HostCheckMiddleware).forRoutes('*')
	}
}
