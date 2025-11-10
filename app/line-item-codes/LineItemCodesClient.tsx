'use client';

import React, { useEffect, useState } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import { Database } from '../lib/types/supabase';

type LineItem = Database['public']['Tables']['line_items']['Row'];

export default function LineItemCodesClient() {
  const supabase = getSupabaseClient();

  const [items, setItems] = useState<LineItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({
    code: '',
    category: '',
    description: '',
    maxRate: '',
    billedRate: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = (await supabase.from('line_items').select('*')) as {
        data: LineItem[] | null;
        error: any;
      };
      if (!mounted) return;
      const { data, error } = res;
      if (error) {
        console.error('Fetch error:', error);
      } else {
        setItems(data ?? []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const max = form.maxRate.trim() === '' ? null : Number(form.maxRate);
  const billed = form.billedRate.trim() === '' ? null : Number(form.billedRate);

  const offset =
    max === null ||
    billed === null ||
    max === 0 ||
    !Number.isFinite(max) ||
    !Number.isFinite(billed)
      ? null
      : ((billed - max) / max) * 100;

  const offsetColor =
    offset === null ? 'black' : offset < 0 ? 'green' : offset === 0 ? 'orange' : 'red';

  const isAddDisabled =
    form.code.trim() === '' ||
    form.category.trim() === '' ||
    max === null ||
    billed === null ||
    !Number.isFinite(max) ||
    !Number.isFinite(billed) ||
    max <= 0 ||
    (offset !== null && offset > 0);

  const handleAdd = async () => {
    if (isAddDisabled) return;

    const newItem = {
      code: form.code,
      category: form.category,
      description: form.description || null,
      max_rate: max as number,
      billed_rate: billed as number,
      rate_offset: offset ?? 0,
    } satisfies Database['public']['Tables']['line_items']['Insert'];

    const res = (await supabase.from('line_items').insert([newItem]).select()) as {
      data: LineItem[] | null;
      error: any;
    };
    const { data, error } = res;

    if (error) {
      console.error('Insert error:', error);
      alert(`Insert failed: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      setItems((prev) => [...prev, data[0]]);
    }

    setFormVisible(false);
    setForm({
      code: '',
      category: '',
      description: '',
      maxRate: '',
      billedRate: '',
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Line Item Codes</h1>

      <button onClick={() => setFormVisible(true)}>Add line item code</button>

      {formVisible && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
            placeholder="Description"
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
          <span style={{ color: offsetColor }}>{offset !== null ? `${offset.toFixed(2)}%` : 'Offset'}</span>
          <button disabled={isAddDisabled} onClick={handleAdd}>
            Add
          </button>
          <button onClick={() => setFormVisible(false)}>Cancel</button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {items.length === 0 ? (
          <div>No line items</div>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: 12, padding: 6, borderBottom: '1px solid #eee' }}>
              <div style={{ minWidth: 100 }}>{item.code}</div>
              <div style={{ minWidth: 120 }}>{item.category}</div>
              <div style={{ minWidth: 160 }}>{item.description ?? '—'}</div>
              <div style={{ minWidth: 80 }}>{item.max_rate ?? '—'}</div>
              <div style={{ minWidth: 80 }}>{item.billed_rate ?? '—'}</div>
              <div style={{ color: item.rate_offset == null ? 'black' : item.rate_offset < 0 ? 'green' : item.rate_offset === 0 ? 'orange' : 'red' }}>
                {typeof item.rate_offset === 'number' ? `${item.rate_offset.toFixed(2)}%` : '—'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}