import React from 'react';

const AdminPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2>Admin Controls</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Section: Manage Business Subscriptions */}
        <section style={{ background: '#f9f9f9', padding: 24, borderRadius: 8 }}>
          <h3>Manage Business Subscriptions</h3>
          <p>Assign, update, or remove subscription plans for businesses. (UI integration needed)</p>
        </section>
        {/* Section: Business Bills */}
        <section style={{ background: '#f9f9f9', padding: 24, borderRadius: 8 }}>
          <h3>Business Bills</h3>
          <p>View and manage all bills for a business. (UI integration needed)</p>
        </section>
        {/* Section: Business Products */}
        <section style={{ background: '#f9f9f9', padding: 24, borderRadius: 8 }}>
          <h3>Business Products</h3>
          <p>View and manage products for a business. (UI integration needed)</p>
        </section>
        {/* Section: Subscription Plans */}
        <section style={{ background: '#f9f9f9', padding: 24, borderRadius: 8 }}>
          <h3>Subscription Plans</h3>
          <p>Manage all subscription plans. <a href="/super-admin/plans-manager">Go to Plans Manager</a></p>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
