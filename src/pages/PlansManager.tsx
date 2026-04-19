import React, { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  active: boolean;
}

const defaultPlans: Plan[] = [
  {
    id: '1',
    name: 'Monthly Pro',
    price: 29,
    duration: 'monthly',
    features: ['users', 'products'],
    active: true,
  },
  {
    id: '2',
    name: 'Semi-Annual Pro',
    price: 149,
    duration: '6 months',
    features: ['users', 'products'],
    active: true,
  },
  {
    id: '3',
    name: 'Yearly Pro',
    price: 249,
    duration: 'yearly',
    features: ['users', 'products'],
    active: true,
  },
];

const PlansManager: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [showForm, setShowForm] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const features = form.features ? [...form.features] : [];
    features[idx] = e.target.value;
    setForm((prev) => ({ ...prev, features }));
  };

  const addFeatureField = () => {
    setForm((prev) => ({ ...prev, features: [...(prev.features || []), ''] }));
  };

  const removeFeatureField = (idx: number) => {
    const features = form.features ? [...form.features] : [];
    features.splice(idx, 1);
    setForm((prev) => ({ ...prev, features }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.duration) return;
    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlan.id ? { ...editingPlan, ...form, features: form.features || [] } : p))
      );
    } else {
      setPlans((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: form.name as string,
          price: Number(form.price),
          duration: form.duration as string,
          features: form.features || [],
          active: true,
        },
      ]);
    }
    setShowForm(false);
    setEditingPlan(null);
    setForm({});
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({ ...plan });
    setShowForm(true);
  };

  const handleDeactivate = (id: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
  };

  const handleActivate = (id: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: true } : p)));
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2>Plans Manager</h2>
      <button onClick={() => { setShowForm(true); setEditingPlan(null); setForm({ features: [''] }); }} style={{ marginBottom: 24 }}>+ New Plan</button>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, marginBottom: 32 }}>
          <div>
            <label>Name: <input name="name" value={form.name || ''} onChange={handleInput} required /></label>
          </div>
          <div>
            <label>Price: <input name="price" type="number" value={form.price || ''} onChange={handleInput} required /></label>
          </div>
          <div>
            <label>Duration: <input name="duration" value={form.duration || ''} onChange={handleInput} required /></label>
          </div>
          <div>
            <label>Features:</label>
            {(form.features || []).map((f, idx) => (
              <div key={idx}>
                <input value={f} onChange={(e) => handleFeatureChange(e, idx)} />
                <button type="button" onClick={() => removeFeatureField(idx)}>-</button>
              </div>
            ))}
            <button type="button" onClick={addFeatureField}>+ Add Feature</button>
          </div>
          <button type="submit">{editingPlan ? 'Update' : 'Add'} Plan</button>
          <button type="button" onClick={() => { setShowForm(false); setEditingPlan(null); setForm({}); }}>Cancel</button>
        </form>
      )}
      <div style={{ display: 'flex', gap: 24 }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 24, minWidth: 250, background: plan.active ? '#fff' : '#f5f5f5' }}>
            <h3>{plan.name}</h3>
            <div><b>₹{plan.price}</b> / {plan.duration}</div>
            <ul>
              {plan.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <button onClick={() => handleEdit(plan)}>Edit</button>
            {plan.active ? (
              <button style={{ color: 'red' }} onClick={() => handleDeactivate(plan.id)}>Deactivate</button>
            ) : (
              <button style={{ color: 'green' }} onClick={() => handleActivate(plan.id)}>Activate</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlansManager;
