import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GetController } from './app.controller.get';
import { GetService } from './app.service.get';
import { Query } from './helpers/Query';
import { Logger } from './helpers/Logger';
import { Schema } from './helpers/Schema';
import { Authentication } from './helpers/Authentication'; 
import auth from './config/auth.config'; 
import database from './config/database.config';
import restrictions from './config/restrictions.config';
import { MySQL } from './databases/mysql.database';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [auth, database, restrictions],
    }),
  ],
  controllers: [GetController],
  providers: [GetService, Authentication, Query, Schema, Logger, MySQL],
  exports: [GetService, Authentication, Query, Schema, Logger, MySQL],
})
export class AppModule {}
