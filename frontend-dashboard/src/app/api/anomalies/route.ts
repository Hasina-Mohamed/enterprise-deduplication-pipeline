import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  user: String(process.env.PGUSER),
  host: String(process.env.PGHOST),
  database: String(process.env.PGDATABASE),
  password: String(process.env.PGPASSWORD),
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const query = `
      SELECT log_id, flagged_partner_id, flagged_name, error_type, logged_at 
      FROM data_ops_staging.audit_anomaly_logs 
      ORDER BY logged_at DESC
    `;
    const res = await pool.query(query);
    
    return NextResponse.json({ anomalies: res.rows });
  } catch (error: any) {
    console.error("❌ ANOMALIES FETCH ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}