import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  console.log('✅ 数据库连接成功');
  console.log('📊 当前数据库表：', Object.keys(schema));

  // 检查是否有用户
  const users = await db.select().from(schema.users).limit(5);
  console.log('👥 当前用户数量：', users.length);

  await pool.end();
}

initDatabase().catch(console.error);
