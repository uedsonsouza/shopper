import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, PG_HOST, PG_PORT } =
  process.env;

const dataSource = new DataSource({
  type: 'postgres',
  host: PG_HOST,
  port: parseInt(PG_PORT, 10),
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  entities: ['typeorm/entities/*.ts'],
  synchronize: true,
  migrations: ['typeorm/migrations/*.ts'],
  logging: true,
});

export default dataSource;
