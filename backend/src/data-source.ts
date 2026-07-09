import 'dotenv/config';
import { DataSource } from 'typeorm';

// CLI-only DataSource for `typeorm migration:generate` / `migration:run`.
// The running app configures its own connection in app.module.ts — this file
// is never imported at runtime, only by the typeorm CLI.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
