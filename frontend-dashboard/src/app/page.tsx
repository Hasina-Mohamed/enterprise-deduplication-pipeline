'use client';
import { useEffect, useState } from 'react';

interface TableRowData {
  partner_id: string;
  beneficiary_name: string;
  identity_id: string;
  region: string;
  quantity_allocated: string | number;
}

interface AnomalyRowData {
  log_id: number;
  flagged_partner_id: string;
  flagged_name: string;
  error_type: string;
  logged_at: string;
}

interface MetricsState {
  totalRecords: number;
  totalQuantity: string | number;
  tableData: TableRowData[];
}

export default function Dashboard() {
  // Defensive initialization states prevent UI whiteouts
  const [metrics, setMetrics] = useState<MetricsState>({ 
    totalRecords: 0, 
    totalQuantity: 0, 
    tableData: [] 
  });
  const [anomalies, setAnomalies] = useState<AnomalyRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'ANOMALIES'>('LEDGER');
  
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedPartner, setSelectedPartner] = useState<string>('ALL');

  const regionsList = ['ALL', 'Benadir', 'Bay', 'Lower Shabelle', 'Gedo', 'Bari'];
  const partnersList = ['ALL', 'WFP_PARTNER_A', 'WFP_PARTNER_B', 'UN_AGENCY_LOCAL', 'NGO_COUNCIL'];

  // Safe volume formatting method to catch NaN issues before they render
  const formatVolume = (val: string | number) => {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) || !parsed ? '0.00' : parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedRegion !== 'ALL') params.append('region', selectedRegion);
    if (selectedPartner !== 'ALL') params.append('partner', selectedPartner);

    fetch(`/api/metrics?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        // Safe assignment handles error conditions gracefully
        setMetrics({
          totalRecords: data.totalRecords || 0,
          totalQuantity: data.totalQuantity || 0,
          tableData: Array.isArray(data.tableData) ? data.tableData : []
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Frontend fetch layout error:", err);
        setLoading(false);
      });
  }, [selectedRegion, selectedPartner]);

  useEffect(() => {
    fetch('/api/anomalies')
      .then((res) => res.json())
      .then((data) => {
        setAnomalies(Array.isArray(data.anomalies) ? data.anomalies : []);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-[#090D1A] text-white font-sans antialiased p-6 md:p-12">
      
      {/* Top Banner Control Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1E2943] pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#C8B6FF]">
              Data-Ops Processing Engine
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Production-grade operational ledger tracking clean, deduplicated humanitarian cargo.
          </p>
        </div>
        
        {activeTab === 'LEDGER' && (
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Filter Region</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-[#111726] border border-[#1E2943] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C8B6FF] transition-colors cursor-pointer"
              >
                {regionsList.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Filter Partner</label>
              <select 
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                className="bg-[#111726] border border-[#1E2943] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C8B6FF] transition-colors cursor-pointer"
              >
                {partnersList.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPI Display Metrics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111726] border border-[#1E2943] p-6 rounded-2xl relative overflow-hidden group">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Deduplicated Verified Records</p>
          <h3 className="text-4xl font-black mt-2 text-white">{metrics.totalRecords}</h3>
        </div>

        <div className="bg-[#111726] border border-[#1E2943] p-6 rounded-2xl relative overflow-hidden group">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Allocated Volume</p>
          <h3 className="text-4xl font-black mt-2 text-[#E7C6FF]">{formatVolume(metrics.totalQuantity)}</h3>
        </div>

        <div className="bg-[#111726] border border-[#1E2943] p-6 rounded-2xl relative overflow-hidden group border-rose-500/20">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Flagged System Anomalies</p>
          <h3 className="text-4xl font-black mt-2 text-rose-400">
            {anomalies.length}{" "}
            <span className="text-xs font-mono font-normal bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 ml-2">
              Isolated
            </span>
          </h3>
        </div>
      </div>

      {/* Navigation View Management Tabs */}
      <div className="flex gap-2 mb-4 border-b border-[#1E2943] pb-px">
        <button 
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === 'LEDGER' ? 'text-[#C8B6FF]' : 'text-gray-400 hover:text-white'}`}
        >
          Verified Ingestion Ledger
          {activeTab === 'LEDGER' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8B6FF]"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('ANOMALIES')}
          className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === 'ANOMALIES' ? 'text-rose-400' : 'text-gray-400 hover:text-white'}`}
        >
          Validation Exception Logs
          {activeTab === 'ANOMALIES' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>}
        </button>
      </div>

      {/* Dynamic Main View Core Panel */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#C8B6FF] animate-pulse font-mono tracking-wider">Re-indexing Relational Stream...</p>
        </div>
      ) : activeTab === 'LEDGER' ? (
        <div className="bg-[#111726] border border-[#1E2943] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[600px]">
              <thead className="bg-[#151D30] text-xs text-gray-400 uppercase font-mono border-b border-[#1E2943]">
                <tr>
                  <th className="p-4 pl-6">Partner Engine</th>
                  <th className="p-4">Beneficiary Target</th>
                  <th className="p-4">Identity Fingerprint</th>
                  <th className="p-4">Geographic Region</th>
                  <th className="p-4 pr-6 text-right">Quantity Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2943]/60">
                {metrics.tableData?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#151D30]/70 transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs text-blue-400">{row.partner_id}</td>
                    <td className="p-4 font-semibold text-white">{row.beneficiary_name}</td>
                    <td className="p-4 font-mono text-xs text-gray-500">{row.identity_id}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-[#1A243B] border border-[#263554] text-gray-300 text-xs rounded-lg">
                        {row.region}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right font-bold text-[#E7C6FF] font-mono">
                      {row.quantity_allocated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#111726] border border-rose-500/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {anomalies.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-mono text-sm">
                No pipeline integration validation exceptions detected in this database tier.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-300 min-w-[600px]">
                <thead className="bg-[#1C1622] text-xs text-rose-400 uppercase font-mono border-b border-rose-500/10">
                  <tr>
                    <th className="p-4 pl-6">Log Key</th>
                    <th className="p-4">Reporting Entity</th>
                    <th className="p-4">Flagged Row Record Profile</th>
                    <th className="p-4">Violation Exception Signature</th>
                    <th className="p-4 pr-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-500/5">
                  {anomalies.map((row) => (
                    <tr key={row.log_id} className="hover:bg-rose-500/[0.02] transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs text-rose-400/70">#ERR-{row.log_id}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{row.flagged_partner_id}</td>
                      <td className="p-4 font-semibold text-white/90">{row.flagged_name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-md">
                          {row.error_type}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right text-xs font-mono text-gray-500">
                        {new Date(row.logged_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}