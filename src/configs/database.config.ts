import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import 'dotenv/config'

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
    ...deconstructMysqlConnectionString(process.env.MYSQL),
  }
})