// 일회성 스키마 적용 스크립트
// 사용:  node apply-schema.js
// 비밀번호는 환경변수 PGPASSWORD 에서 읽음 (없으면 인자에서 폴백)

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const config = {
  host: process.env.PGHOST || "db.uusnyvyoubbojtozzuhk.supabase.co",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

if (!config.password) {
  console.error("PGPASSWORD 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

(async () => {
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  const client = new Client(config);

  console.log(`▶ 연결 중: ${config.user}@${config.host}:${config.port}/${config.database}`);
  try {
    await client.connect();
  } catch (e) {
    console.error("❌ 연결 실패:", e.message);
    console.error("   → IPv4 환경이라면 Supabase Pooler 주소가 필요할 수 있습니다.");
    process.exit(2);
  }
  console.log("✅ 연결 성공\n");

  try {
    console.log("▶ schema.sql 실행 중...");
    await client.query(sql);
    console.log("✅ 스키마 적용 완료\n");

    // 검증: 생성된 객체 확인
    const checks = await client.query(`
      select 'table'    as kind, table_name as name
        from information_schema.tables
       where table_schema = 'public' and table_name = 'todos'
      union all
      select 'view',     table_name
        from information_schema.views
       where table_schema = 'public' and table_name = 'todos_stats'
      union all
      select 'function', routine_name
        from information_schema.routines
       where routine_schema = 'public' and routine_name = 'set_updated_at'
      union all
      select 'policy',   policyname
        from pg_policies
       where schemaname = 'public' and tablename = 'todos'
      order by kind, name;
    `);

    console.log("📋 생성/존재 확인:");
    for (const r of checks.rows) {
      console.log(`  • ${r.kind.padEnd(8)} ${r.name}`);
    }
  } catch (e) {
    console.error("❌ 실행 실패:", e.message);
    process.exit(3);
  } finally {
    await client.end();
  }
})();
