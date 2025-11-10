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

  // validation for code: only digits and underscores
  const codePattern = /^[0-9_]+$/;
  const codeTrimmed = form.code.trim();
  const codeIsValid = codeTrimmed === '' ? false : codePattern.test(codeTrimmed);
  const codeError = codeTrimmed !== '' && !codeIsValid ? 'Code may contain only digits and underscores' : '';

  const maxRaw = form.maxRate.trim();
  const billedRaw = form.billedRate.trim();
  const max = maxRaw === '' ? null : Number(maxRaw);
  const billed = billedRaw === '' ? null : Number(billedRaw);

  const maxError = maxRaw !== '' && !Number.isFinite(max) ? 'Enter a valid number' : '';
  const billedError = billedRaw !== '' && !Number.isFinite(billed) ? 'Enter a valid number' : '';

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
    !codeIsValid ||
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
    } as Database['public']['Tables']['line_items']['Insert'];

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

  // delete handler: removes from DB and UI
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this line item?')) return;
    const { error } = await supabase.from('line_items').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Line Item Codes</h1>

      <button onClick={() => setFormVisible(true)}>Add line item code</button>

      {formVisible && (
        <div className="form-table" style={{ marginTop: 12 }}>
          <label htmlFor="code" className="label">Line Item Code</label>
          <div className="control">
            <input
              id="code"
              placeholder="e.g. 01_011_0107_1_1"
              value={form.code}
              aria-invalid={!!codeError}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, code: e.target.value })}
            />
            {codeError && <div className="field-error">{codeError}</div>}
          </div>

          <label htmlFor="category" className="label">Category</label>
          <div className="control">
            <select
              id="category"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              <option value="CORE">CORE</option>
              <option value="Home and Living">Home and Living</option>
              <option value="Access Community Social and Rec Activities">
                Access Community Social and Rec Activities
              </option>
            </select>
          </div>

          <label htmlFor="description" className="label">Description</label>
          <div className="control description-control">
            <input
              id="description"
              type="text"
              placeholder="To be shown on the invoice"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <label htmlFor="maxRate" className="label">Max Rate</label>
          <div className="control small-control">
            <input
              id="maxRate"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={form.maxRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, maxRate: e.target.value })}
            />
            {maxError && <div className="field-error">{maxError}</div>}
          </div>

          <label htmlFor="billedRate" className="label">Billed Rate</label>
          <div className="control small-control">
            <input
              id="billedRate"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={form.billedRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, billedRate: e.target.value })}
            />
            {billedError && <div className="field-error">{billedError}</div>}
          </div>

          <label className="label">Offset</label>
          <div className="control">
            <span style={{ color: offsetColor }}>{offset !== null ? `${offset.toFixed(2)}%` : '—'}</span>
          </div>

          <div></div>
          <div className="actions">
            <button disabled={isAddDisabled} onClick={handleAdd}>
              Add
            </button>
            <button className="ghost" onClick={() => setFormVisible(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {/* table headers */}
        <div className="records-table" role="table" aria-label="Line items">
          <div className="records-header" role="row">
            <div role="columnheader">Line Item Code</div>
            <div role="columnheader">Category</div>
            <div role="columnheader">Description</div>
            <div role="columnheader">Max Rate</div>
            <div role="columnheader">Billed Rate</div>
            <div role="columnheader">Offset</div>
            <div role="columnheader" style={{ justifySelf: 'end' }}>Actions</div>
          </div>

          <div className="records-body" role="rowgroup">
            {items.length === 0 ? (
              <div className="no-records">No line items</div>
            ) : (
              <>
                {items.map((item) => (
                  <div key={item.id} className="row" role="row">
                    <div className="cell">{item.code}</div>
                    <div className="cell">{item.category}</div>
                    <div className="cell desc-cell">{item.description ?? '—'}</div>
                    <div className="cell">{item.max_rate ?? '—'}</div>
                    <div className="cell">{item.billed_rate ?? '—'}</div>
                    <div className="cell">{typeof item.rate_offset === 'number' ? `${item.rate_offset.toFixed(2)}%` : '—'}</div>
                    <div className="cell actions-cell">
                      <button className="trash" title="Delete" onClick={() => handleDelete(item.id as number)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}