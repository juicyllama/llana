import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import 'dotenv/config'
import { Base } from './BaseEntity';

export function deconstructMysqlConnectionString(connectionString: string): Partial<TypeOrmModuleOptions> {
    const regex = /^mysql:\/\/(?<username>.*?):(?<password>.*?)@(?<host>.*?):(?<port>\d+)\/(?<database>.*?)$/;
    const match = connectionString.match(regex);
  
    if (!match || !match.groups) {
      throw new Error('Invalid connection string format');
    }
  
    const { username, password, host, port, database } = match.groups;
  
    return {
      host,
      port: parseInt(port, 10),
      username,
      password,
      database,
    };

}

export const databaseConfig = registerAs('database', () => {
	return  <TypeOrmModuleOptions>{
    type: 'mysql',
    keepConnectionAlive: true,
    ...deconstructMysqlConnectionString(process.env.DATABASE_URI),
    entities: [Base]
  }
})

export function UrlToTable(uri: string, dropSlashes?: number ): string {

    //Remove first slash
    uri = uri.substring(1)

    //Drop last part of the url based on the number of slashes
    if(dropSlashes && dropSlashes > 0){
        uri = uri.split('/').slice(0, -dropSlashes).join('/')
    }

    //Sanitize string
    uri = uri.replace(/[^a-zA-Z0-9]/g, '_')

    return uri
}

export function getDatabaseType(uri: string): string {
    if(uri.includes('mysql')){
        return 'mysql'
    }else if(uri.includes('postgres')){
        return 'postgres'
    }else if(uri.includes('mssql')){
        return 'mssql'
    }else if(uri.includes('sqlite')){
        return 'sqlite'
    }else{
        throw new Error('Database type not supported')
    }
}