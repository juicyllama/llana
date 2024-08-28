import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './configs/database.config';
import { Logger } from '@juicyllama/utils';
import { Query } from './helpers/Query';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig()),
  ],
  controllers: [AppController],
  providers: [AppService, Logger, Query],
})
export class AppModule {}
