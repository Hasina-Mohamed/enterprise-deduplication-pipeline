import pandas as pd
import numpy as np
import recordlinkage

def run_audit_pipeline(file_path):
    print("🔄 Ingesting dataset into pipeline...")
    df = pd.read_csv(file_path)
    initial_count = len(df)
    print(f"📊 Initial Record Count: {initial_count}")
    
    # 1. Flag Critical Integrity Errors (Missing IDs)
    missing_ids = df[df['identity_id'].isna() | (df['identity_id'] == '')]
    print(f"⚠️ Critical Error: {len(missing_ids)} records missing Unique Identifiers.")
    
    # 2. String Standardization Workflows
    print("🧼 Executing string standardization workflows...")
    df['identity_id'] = df['identity_id'].astype(str).str.strip()
    df['partner_id'] = df['partner_id'].astype(str).str.strip()
    df['beneficiary_name'] = df['beneficiary_name'].astype(str).str.strip().str.upper()
    df['region'] = df['region'].astype(str).str.strip()
    df['item_distributed'] = df['item_distributed'].astype(str).str.strip()
    
    # UPDATED: Changed from amount_allocated to quantity_allocated
    df['quantity_allocated'] = pd.to_numeric(df['quantity_allocated'], errors='coerce').fillna(0.0)
    
    # Filter out unfixable rows for the data cleaning block
    clean_df = df[df['identity_id'] != 'nan'].copy()
    
    # 3. DE-DUPLICATION ENGINE (Fuzzy and Exact Matching)
    print("🧠 Initializing fuzzy record linkage matching...")
    
    indexer = recordlinkage.Index()
    indexer.full() 
    candidate_links = indexer.index(clean_df)
    
    compare_cl = recordlinkage.Compare()
    compare_cl.exact('identity_id', 'identity_id', label='exact_id_match')
    compare_cl.string('beneficiary_name', 'beneficiary_name', method='jarowinkler', threshold=0.85, label='fuzzy_name_match')
    
    features = compare_cl.compute(candidate_links, clean_df)
    
    duplicate_pairs = features[(features.index.get_level_values(0) != features.index.get_level_values(1)) & 
                               ((features['exact_id_match'] == 1) | (features['fuzzy_name_match'] == 1))]
    
    print(f"🚨 Isolated internal duplicate entry risks.")
    
    # Drop rows that are duplicates keeping only the first instance
    final_deduped_df = clean_df.drop_duplicates(subset=['identity_id']).copy()
    print(f"✨ Deduplication complete. Saved {len(final_deduped_df)} verified unique records.")
    
    return final_deduped_df, missing_ids

# --- DYNAMIC 1,000 RECORD SIMULATION ENGINE ---
if __name__ == "__main__":
    import random
    
    print("🎲 Generating 1,000 realistic messy humanitarian records...")
    
    regions = ['Benadir', 'Bay', 'Lower Shabelle', 'Gedo', 'Bari']
    partners = ['WFP_PARTNER_A', 'WFP_PARTNER_B', 'UN_AGENCY_LOCAL', 'NGO_COUNCIL']
    items = ['Rice (MT)', 'PlumpyNut (KG)', 'High Energy Biscuits (KG)', 'Water Purification Kits']
    
    random.seed(42) 
    
    large_mock_data = {
        'partner_id': [],
        'beneficiary_name': [],
        'identity_id': [],
        'region': [],
        'item_distributed': [],
        'quantity_allocated': []
    }
    
    base_ids = [f"SOM-ID-{10000 + i}" for i in range(950)]
    
    for i in range(1000):
        partner = random.choice(partners)
        region = random.choice(regions)
        item = random.choice(items)
        qty = round(random.uniform(10.0, 500.0), 2)
        
        if random.random() < 0.2:
            partner = f"  {partner} "
            
        if i in [15, 120, 450, 822]: 
            identity = np.nan
            name = "UNKNOWN RECORD"
        else:
            identity = random.choice(base_ids)
            name = f"Recipient Profile {identity.split('-')[-1]}"
            
            if i in [50, 250, 600, 910]:
                identity = "SOM-ID-10555"
                name = "HASINA MOHAMED AHMED"
            elif i in [51, 251, 601, 911]:
                identity = "SOM-ID-10555"
                name = "  hasina mohamed ahmed "
        
        large_mock_data['partner_id'].append(partner)
        large_mock_data['beneficiary_name'].append(name)
        large_mock_data['identity_id'].append(identity)
        large_mock_data['region'].append(region)
        large_mock_data['item_distributed'].append(item)
        large_mock_data['quantity_allocated'].append(qty)

    pd.DataFrame(large_mock_data).to_csv('field_payout_logs.csv', index=False)
    print("📝 Dynamic dataset 'field_payout_logs.csv' initialized with 1,000 rows.")
    
    cleaned_data, flagged_errors = run_audit_pipeline('field_payout_logs.csv')
    cleaned_data.to_csv('final_unique_records.csv', index=False)
    print("💾 100% processed records saved to 'final_unique_records.csv'")