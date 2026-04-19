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
              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Total users</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>248</div>
                  <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 4 }}>+14 this month</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Active subs</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>184</div>
                  <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 4 }}>+8 this month</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>MRR</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>₹1.8L</div>
                  <div style={{ fontSize: 12, color: '#3B6D11', marginTop: 4 }}>+22% MoM</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Active trials</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>31</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>≤7 days left</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Open tickets</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>7</div>
                  <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 4 }}>2 critical</div>
                </div>
              </div>
              {/* Main Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
                {/* Recent Registrations */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Recent registrations</div>
                    <button style={{ background: 'none', color: '#4f94ef', border: 'none', fontSize: 13, cursor: 'pointer' }}>All users →</button>
                  </div>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#888', fontWeight: 600 }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Shop</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Plan</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Joined</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 8px' }}><div style={{ fontWeight: 600 }}>Ramesh Stores</div><div style={{ fontSize: 11, color: '#888' }}>ramesh@gmail.com</div></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#EEEDFE', color: '#534AB7', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Pro</span></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Active</span></td>
                        <td style={{ padding: '6px 8px', color: '#888' }}>Apr 18</td>
                        <td><button style={{ background: '#f6f8fa', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>View</button></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 8px' }}><div style={{ fontWeight: 600 }}>Priya Kirana</div><div style={{ fontSize: 11, color: '#888' }}>priya.k@shop.in</div></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#E6F1FB', color: '#185FA5', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Basic</span></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#E6F1FB', color: '#185FA5', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Trial</span></td>
                        <td style={{ padding: '6px 8px', color: '#888' }}>Apr 17</td>
                        <td><button style={{ background: '#f6f8fa', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>View</button></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 8px' }}><div style={{ fontWeight: 600 }}>Mehta Wholesale</div><div style={{ fontSize: 11, color: '#888' }}>mehta@biz.com</div></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#EEEDFE', color: '#534AB7', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Pro</span></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Active</span></td>
                        <td style={{ padding: '6px 8px', color: '#888' }}>Apr 15</td>
                        <td><button style={{ background: '#f6f8fa', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>View</button></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 8px' }}><div style={{ fontWeight: 600 }}>Sunita General</div><div style={{ fontSize: 11, color: '#888' }}>sunita@store.in</div></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#F1EFE8', color: '#5F5E5A', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Free</span></td>
                        <td style={{ padding: '6px 8px' }}><span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 10px', borderRadius: 8, fontWeight: 600, fontSize: 12 }}>Suspended</span></td>
                        <td style={{ padding: '6px 8px', color: '#888' }}>Mar 30</td>
                        <td><button style={{ background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Unsuspend</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Plan Distribution & Live Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Plan distribution</div>
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ minWidth: 50, fontWeight: 600, fontSize: 13 }}>Pro</div>
                        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '54%', height: '100%', background: '#534AB7', borderRadius: 3 }}></div>
                        </div>
                        <div style={{ minWidth: 60, color: '#888', fontSize: 12 }}>134 users</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ minWidth: 50, fontWeight: 600, fontSize: 13 }}>Basic</div>
                        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '30%', height: '100%', background: '#4f94ef', borderRadius: 3 }}></div>
                        </div>
                        <div style={{ minWidth: 60, color: '#888', fontSize: 12 }}>73 users</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ minWidth: 50, fontWeight: 600, fontSize: 13 }}>Trial</div>
                        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '13%', height: '100%', background: '#EF9F27', borderRadius: 3 }}></div>
                        </div>
                        <div style={{ minWidth: 60, color: '#888', fontSize: 12 }}>31 users</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ minWidth: 50, fontWeight: 600, fontSize: 13 }}>Free</div>
                        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '4%', height: '100%', background: '#B4B2A9', borderRadius: 3 }}></div>
                        </div>
                        <div style={{ minWidth: 60, color: '#888', fontSize: 12 }}>10 users</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Live activity</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#e24b4a', marginTop: 5 }}></div>
                        <div>
                          <div style={{ fontSize: 13 }}>Sunita General suspended</div>
                          <div style={{ fontSize: 11, color: '#888' }}>10 min ago · by admin</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B6D11', marginTop: 5 }}></div>
                        <div>
                          <div style={{ fontSize: 13 }}>Ramesh Stores → Pro plan</div>
                          <div style={{ fontSize: 11, color: '#888' }}>1 hr ago</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#4f94ef', marginTop: 5 }}></div>
                        <div>
                          <div style={{ fontSize: 13 }}>New user: Priya Kirana</div>
                          <div style={{ fontSize: 11, color: '#888' }}>3 hr ago</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#EF9F27', marginTop: 5 }}></div>
                        <div>
                          <div style={{ fontSize: 13 }}>Ticket #041 opened — critical</div>
                          <div style={{ fontSize: 11, color: '#888' }}>5 hr ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
