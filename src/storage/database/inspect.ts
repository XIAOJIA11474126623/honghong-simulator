import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function inspectDatabase() {
  console.log('🔍 正在连接数据库...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  try {
    // 检查用户表
    console.log('📋 用户表:');
    const users = await db.select().from(schema.users);
    console.log(`   - 总用户数: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.username} (创建时间: ${user.created_at})`);
    });
    console.log('');

    // 检查游戏记录表
    console.log('🎮 游戏记录表:');
    const gameRecords = await db.select().from(schema.gameRecords);
    console.log(`   - 总记录数: ${gameRecords.length}`);
    gameRecords.forEach(record => {
      console.log(`   - ${record.scenario}: ${record.final_score}分 (${record.result})`);
    });
    console.log('');

    // 检查表结构
    console.log('🏗️ 数据库表结构:');
    const tables = Object.keys(schema);
    tables.forEach(table => {
      console.log(`   - ${table}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await pool.end();
  }
}

inspectDatabase().catch(console.error);
