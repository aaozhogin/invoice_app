'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type LineItem = {
  id?: string;
  code: string;
  category: string;
  description?: string;
  max_rate: number;
  billed_rate: number;
  rate_offset: number;
};

export default function LineItemCodesClient() {
  const [items, setItems] = useState<LineItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({
    code: '',
    category: '',
    description: '',
    maxRate: '',
    billedRate: '',
  });

  // Fetch existing items on load
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from('line_items').select('*');
      if (error) console.error('Fetch error:', error);
      else setItems(data);
    };
    fetchItems();
  }, []);

  const max = parseFloat(form.maxRate);
  const billed = parseFloat(form.billedRate);
  const offset = isNaN(max) || isNaN(billed) ? null : ((billed - max) / max) * 100;

  const offsetColor =
    offset === null
      ? 'black'
      : offset < 0
      ? 'green'
      : offset === 0
      ? 'orange'
      : 'red';

  const isAddDisabled = offset !== null && offset > 0;

  const handleAdd = async () => {
    if (isAddDisabled) return;

    const newItem: LineItem = {
      code: form.code,
      category: form.category,
      description: form.description,
      max_rate: max,
      billed_rate: billed,
      rate_offset: offset ?? 0,
    };

    const { data, error } = await supabase.from('line_items').insert([newItem]).select();
    if (error) {
      console.error('Insert error:', error);
      return;
    }

    setItems([...items, data[0]]);
    setFormVisible(false);
    setForm({ code: '', category: '', description: '', maxRate: '', billedRate: '' });
  };

  return (
    <div>
      <h1>This is a line item codes page</h1>
      <button onClick={() => setFormVisible(true)}>Add line item code</button>

      {formVisible && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            placeholder="Line Item Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            placeholder="Max Rate"
            type="number"
            value={form.maxRate}
            onChange={(e) => setForm({ ...form, maxRate: e.target.value })}
          />
          <input
            placeholder="Billed Rate"
            type="number"
            value={form.billedRate}
            onChange={(e) => setForm({ ...form, billedRate: e.target.value })}
          />
          <span style={{ color: offsetColor, minWidth: '80px' }}>
            {offset !== null ? `${offset.toFixed(2)}%` : 'Offset'}
          </span>
          <button disabled={isAddDisabled} onClick={handleAdd}>
            Add
          </button>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        {items.map((item, idx) => (
          <div key={item.id ?? idx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <span>{item.code}</span>
            <span>{item.category}</span>
            <span>{item.description}</span>
            <span>{item.max_rate}</span>
            <span>{item.billed_rate}</span>
            <span style={{ color: item.rate_offset < 0 ? 'green' : item.rate_offset === 0 ? 'orange' : 'red' }}>
              {item.rate_offset.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}