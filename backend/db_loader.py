import os
import pandas as pd
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Search for the .env file globally or locally
load_dotenv()
# If you kept a copy inside frontend-dashboard, this explicitly targets it from the backend folder:
load_dotenv(os.path.join(os.path.dirname(__file__), '../frontend-dashboard/.env'))

def load_to_postgres(clean_file, raw_file):
    print("🔌 Connecting to Neon Cloud PostgreSQL...")
    
    # Neon provides a single 'DATABASE_URL' string which is perfect for Python.
    # If DATABASE_URL isn't in your .env, we construct it dynamically from your individual keys.
    db_url = os.getenv("DATABASE_URL")
    
    try:
        if db_url:
            conn = psycopg2.connect(db_url)
        else:
            # Fallback to individual credentials securely cast to strings
            conn = psycopg2.connect(
                dbname=str(os.getenv("PGDATABASE")),
                user=str(os.getenv("PGUSER")),
                password=str(os.getenv("PGPASSWORD")),
                host=str(os.getenv("PGHOST")),
                port=str(os.getenv("PGPORT") or "5432"),
                sslmode="require" # Crucial for Neon cloud security compliance
            )
            
        cursor = conn.cursor()
        print("✅ Connected successfully to Neon cloud cluster!")
        
        # 1. Read and Ingest Deduplicated Clean Verified Records
        df_clean = pd.read_csv(clean_file)
        clean_records = [
            tuple(x) for x in df_clean[['partner_id', 'beneficiary_name', 'identity_id', 'region', 'item_distributed', 'quantity_allocated']].values
        ]
        
        insert_clean_query = """
            INSERT INTO data_ops_staging.verified_beneficiaries (
                partner_id, beneficiary_name, identity_id, region, item_distributed, quantity_allocated
            ) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (identity_id) DO NOTHING;
        """
        print(f"📥 Bulk ingesting {len(clean_records)} verified records to Neon staging schema...")
        extras.execute_batch(cursor, insert_clean_query, clean_records)
        
        # 2. Extract and Isolate Structural Pipeline Anomalies
        df_raw = pd.read_csv(raw_file)
        anomalies = df_raw[df_raw['identity_id'].isna() | (df_raw['identity_id'] == '')]
        
        if len(anomalies) > 0:
            anomaly_records = [
                (row['partner_id'], row['beneficiary_name'], 'MISSING_UNIQUE_IDENTIFIER')
                for _, row in anomalies.iterrows()
            ]
            insert_anomaly_query = """
                INSERT INTO data_ops_staging.audit_anomaly_logs (
                    flagged_partner_id, flagged_name, error_type
                ) VALUES (%s, %s, %s);
            """
            print(f"⚠️ Logging {len(anomaly_records)} structural validation anomalies to Neon exception registers...")
            extras.execute_batch(cursor, insert_anomaly_query, anomaly_records)
            
        # Commit the transaction block safely
        conn.commit()
        print("🚀 Neon Cloud Data pipeline sync complete!")
        
    except Exception as error:
        if 'conn' in locals():
            conn.rollback()
        print(f"❌ Ingestion aborted. Database rolled back safely. Error: {error}")
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    load_to_postgres('final_unique_records.csv', 'field_payout_logs.csv')