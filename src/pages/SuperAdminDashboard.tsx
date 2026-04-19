import React, { useState } from 'react';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'users', label: 'All Users' },
  { id: 'tenants', label: 'Shop Tenants' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'plans', label: 'Plans & Pricing' },
  { id: 'tickets', label: 'Support Tickets' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'health', label: 'System Health' },
  { id: 'settings', label: 'Platform Settings' },
];

const SuperAdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f8fa' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0a1628', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#4f94ef', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>IA</span>
            </div>
            <span style={{ fontWeight: 500, fontSize: 15 }}>Invoice Adda</span>
          </div>
          {/* Removed SUPER ADMIN label for cleaner UI */}
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {sections.map((sec) => (
            <div
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                padding: '10px 24px',
                cursor: 'pointer',
                background: activeSection === sec.id ? 'rgba(79,148,239,.13)' : 'none',
                color: activeSection === sec.id ? '#fff' : 'rgba(255,255,255,.7)',
                borderLeft: activeSection === sec.id ? '3px solid #4f94ef' : '3px solid transparent',
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {sec.label}
            </div>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4f94ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>AD</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Admin</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Full access</div>
            </div>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{sections.find(s => s.id === activeSection)?.label || ''}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Invoice Adda · Admin Panel · April 2026</div>
          </div>
          <div>
            <button style={{ background: '#0a1628', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Action</button>
          </div>
        </header>
        {/* Content */}
        <section style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          {activeSection === 'overview' && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Platform Overview</h2>
              <div style={{ color: '#666', fontSize: 14 }}>Key metrics, recent activity, and platform health at a glance.</div>
              {/* Add dashboard widgets here */}
            </div>
          )}
          {activeSection === 'users' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>All Users</h2>
              <div style={{ color: '#666', fontSize: 14 }}>User management, search, and actions.</div>
              {/* Add user table here */}
            </div>
          )}
          {/* Add more sections as needed */}
          <div style={{ marginTop: 40, color: '#bbb', fontSize: 12 }}>Section: {activeSection}</div>
        </section>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
