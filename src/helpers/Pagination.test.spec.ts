import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from "@nestjs/config";
import { Pagination } from "./Pagination"
import { Logger } from "./Logger";
import auth from '../config/auth.config'; 
import database from '../config/database.config';
import restrictions from '../config/restrictions.config';

describe('Pagination', () => {

    let app: TestingModule;
    let pagination: Pagination;
    let configService: ConfigService;

    beforeEach(async () => {
        app = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                  load: [auth, database, restrictions],
                }),
              ],
              providers: [Pagination, Logger],
              exports: [Pagination, Logger],            
          
        }).compile();
    
        pagination = app.get<Pagination>(Pagination);
        configService = app.get<ConfigService>(ConfigService);   
      });
   
    describe('get', () => {
        it('No params passed', () => {
            const query = {}
            const result = pagination.get(query)
            expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
            expect(result.offset).toBe(0)
        })

        it('Limit passed', () => {
            const query = {
                limit: 10
            }
            const result = pagination.get(query)
            expect(result.limit).toBe(10)
            expect(result.offset).toBe(0)
        })

        it('Offset passed', () => {
            const query = {
                offset: 10
            }
            const result = pagination.get(query)
            expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
            expect(result.offset).toBe(10)
        })

        it('Page passed', () => {

            const query = {
                page: pagination.encodePage({limit: 100, offset: 50})
            }
            const result = pagination.get(query)
            expect(result.limit).toBe(100)
            expect(result.offset).toBe(50)
        })

        it('Other value passed', () => {

            const query = {
                foo: 'bar'
            }
            const result = pagination.get(query)
            expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
            expect(result.offset).toBe(0)
        })
    })

})
  