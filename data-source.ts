import { Todo } from './src/entity/todo.entity';
import { User } from './src/entity/user.entity';
import { DataSource } from 'typeorm';
import 'dotenv/config'

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.USERNAME_DB,
  password: process.env.PASSWORD_DB,
  database: process.env.DATABASE_DB,
  entities: [Todo, User],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
