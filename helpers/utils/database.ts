interface ConnectionOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}  

export function deconstructMysqlConnectionString(connectionString: string): ConnectionOptions {
    const regex = /^mysql:\/\/(?<user>.*?):(?<password>.*?)@(?<host>.*?):(?<port>\d+)\/(?<database>.*?)$/;
    const match = connectionString.match(regex);
  
    if (!match || !match.groups) {
      throw new Error('Invalid connection string format');
    }
  
    const { user, password, host, port, database } = match.groups;
  
    return {
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
    };

}