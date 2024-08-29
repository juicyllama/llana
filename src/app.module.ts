import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GetController } from './app.controller.get';
import { GetService } from './app.service.get';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './helpers/Database';
import { Query } from './helpers/Query';
import { Logger } from './helpers/Logger';
import { DataSource } from 'typeorm';
import database from './config/database.config';
import { Schema } from './helpers/Schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [database],
    }),
    TypeOrmModule.forRoot(databaseConfig())
  ],
  controllers: [GetController],
  providers: [GetService, Query, Schema, Logger],
  exports: [GetService, Query, Schema, Logger]
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
