import {Controller, Get, Req, Res} from '@nestjs/common';
//import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(){}
    //private readonly appService: AppService) {}

  @Get('*')
  getEndpoint(@Req() req, @Res() res): string {

    console.log('req.originalUrl', req.originalUrl)
    console.log('req.query', req.query)

    return res.send('Hello World!');
  }
}
