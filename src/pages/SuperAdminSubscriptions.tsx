import React, { useState } from 'react';

const initialSubscriptions = [
  { id: 1, business: 'Indian Pharmacy', plan: 'Monthly Pro', status: 'Active', expiry: 'Apr 18, 2027', price: '₹', },
  { id: 2, business: 'asdfghjkl;', plan: 'Monthly Pro', status: 'Expired', expiry: 'Apr 18, 2026', price: '₹', },
  { id: 3, business: 'Mother dairy', plan: 'Semi-Annual Pro', status: 'Active', expiry: 'Apr 18, 2027', price: '₹149', },
  { id: 4, business: 'Shakya', plan: 'Monthly Pro', status: 'Expired', expiry: 'Mar 09, 2026', price: '₹', },
  { id: 5, business: 'Shakya store', plan: 'Yearly Pro', status: 'Active', expiry: 'Mar 09, 2027', price: '₹249', },
  { id: 6, business: 'shakya store', plan: 'Semi-Annual Pro', status: 'Active', expiry: 'Oct 19, 2026', price: '₹149', },
];

const statusColors = {
  Active: { bg: '#EAF3DE', color: '#3B6D11' },
  Expired: { bg: '#FCEBEB', color: '#A32D2D' },
};

const SuperAdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = statusFilter ? subscriptions.filter(s => s.status === statusFilter) : subscriptions;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(90deg,#eafaf1 0,#f5fafd 100%)', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e0f2e9' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#3B6D11', marginBottom: 4 }}>Monthly Recurring Revenue (Active Only)</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1a7f37', letterSpacing: '-1px' }}>₹547</div>
          </div>
          <div style={{ color: '#888', fontSize: 13 }}>{filtered.length} subscriptions</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginRight: 16 }}>Subscriptions <span style={{ fontSize: 13, color: '#888' }}>({subscriptions.length})</span></div>
        <div style={{ color: '#888', fontSize: 13 }}>All subscriptions with inline extend & cancel controls</div>
        <div style={{ marginLeft: 'auto' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Business</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Plan</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Expiry</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Price</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888', fontSize: 13 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.business}</td>
                <td style={{ padding: '12px 16px' }}>{s.plan}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: statusColors[s.status].bg, color: statusColors[s.status].color, padding: '3px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}>{s.status}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>{s.expiry}</td>
                <td style={{ padding: '12px 16px' }}>{s.price}</td>
                <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                  <button style={{ background: '#eaf3de', color: '#3B6D11', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>+1M</button>
                  <button style={{ background: '#eaf3de', color: '#3B6D11', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>+1Y</button>
                  <button style={{ background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, padding: '4px 14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminSubscriptions;
