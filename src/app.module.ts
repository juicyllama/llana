import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GetController } from './app.controller.get';
import { GetService } from './app.service.get';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './helpers/Database';
import { Query } from './helpers/Query';
import { Logger } from './helpers/Logger';
import { DataSource } from 'typeorm';
import { Schema } from './helpers/Schema';
import { Authentication } from './helpers/Authentication'; 
import auth from './config/auth.config'; 
import database from './config/database.config';
import restrictions from './config/restrictions.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [auth, database, restrictions],
    }),
    TypeOrmModule.forRoot(databaseConfig())
  ],
  controllers: [GetController],
  providers: [GetService, Authentication, Query, Schema, Logger],
  exports: [GetService, Authentication, Query, Schema, Logger]
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
