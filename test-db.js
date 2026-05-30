require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function test() {
  console.log('测试数据库连接...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL 未设置');
    return;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await pool.query('SELECT NOW()');
    console.log('✅ 数据库连接成功！');
    console.log('当前时间:', result.rows[0].now);

    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

test();
