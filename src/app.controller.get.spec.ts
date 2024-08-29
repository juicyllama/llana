import { Test, TestingModule } from '@nestjs/testing';
import { GetController } from './app.controller.get';
import { GetService } from './app.service.get';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [GetController],
      providers: [GetService],
    }).compile();
  });

//   describe('getHello', () => {
//     it('should return "Hello World!"', () => {
//       const appController = app.get(AppController);
//       expect(appController.getHello()).toBe('Hello World!');
//     });
//   });
});
