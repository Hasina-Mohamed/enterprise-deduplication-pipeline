import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';

// Force Next.js to bypass static caching to keep the database stream live
export const dynamic = 'force-dynamic';

// Explicit type definition matching the PostgreSQL schema row layout
interface BeneficiaryRow {
  partner_id: string;
  beneficiary_name: string;
  identity_id: string;
  region: string;
  quantity_allocated: string;
}

// Secure database pool initialization using environment configurations
// Secure database pool initialization with cloud SSL configurations
const pool = new Pool({
  user: String(process.env.PGUSER),
  host: String(process.env.PGHOST),
  database: String(process.env.PGDATABASE),
  password: String(process.env.PGPASSWORD),
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  ssl: {
    rejectUnauthorized: false, // Required for secure cloud environments like Neon
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionFilter = searchParams.get('region');
    const partnerFilter = searchParams.get('partner');

    // Dynamic SQL Query Builder Components
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (regionFilter && regionFilter !== 'ALL') {
      queryParams.push(regionFilter);
      whereClauses.push(`region = $${queryParams.length}`);
    }

    if (partnerFilter && partnerFilter !== 'ALL') {
      queryParams.push(partnerFilter);
      whereClauses.push(`partner_id = $${queryParams.length}`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Compute Dynamic Count for Verified Unique Ledger Entries
    const countQuery = `SELECT COUNT(*) FROM data_ops_staging.verified_beneficiaries ${whereString}`;
    const countRes = await pool.query<{ count: string }>(countQuery, queryParams);
    
    // 2. Compute Dynamic Volumetric Sum Calculations
    const sumQuery = `SELECT SUM(quantity_allocated) FROM data_ops_staging.verified_beneficiaries ${whereString}`;
    const sumRes = await pool.query<{ sum: string | null }>(sumQuery, queryParams);
    
    // 3. Query Scoped Relational Table Streams
    const tableQuery = `
      SELECT partner_id, beneficiary_name, identity_id, region, quantity_allocated 
      FROM data_ops_staging.verified_beneficiaries 
      ${whereString}
      ORDER BY quantity_allocated DESC
      LIMIT 6
    `;
    const tableRes = await pool.query<BeneficiaryRow>(tableQuery, queryParams);

    // Return sanitized JSON response payload to the client UI layer
    return NextResponse.json({
      totalRecords: parseInt(countRes.rows[0].count, 10),
      totalQuantity: parseFloat(sumRes.rows[0].sum || '0').toFixed(2),
      tableData: tableRes.rows
    });
  } catch (error: any) {
    // Add this line to print the exact database connection error to your code terminal!
    console.error("❌ NEXT.JS DATABASE POOL ERROR:", error); 
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
