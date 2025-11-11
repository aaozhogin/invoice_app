'use client';

import React, { useEffect, useState, useRef } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import { Database } from '../lib/types/supabase';

type LineItem = Database['public']['Tables']['line_items']['Row'];

function TimePicker({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  // hours: 0-12 only
  const hours24 = Array.from({ length: 13 }, (_, i) => i);
  const minutes = ['00', '15', '30', '45'];

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const hr24 = value ? parseInt(value.split(':')[0], 10) : 0;
  const mn = value ? value.split(':')[1] : '';

  // determine display hour and AM/PM based on hr24
  const isPM = hr24 >= 12;
  const displayHr = hr24 === 0 ? 0 : hr24 > 12 ? hr24 - 12 : hr24;
  const apStr = isPM ? 'PM' : 'AM';

  // allowed AM/PM based on hour selection (0 only AM, 12 only PM, others both)
  const allowedAMPM = (h24: number): string[] => {
    if (h24 === 0) return ['AM'];
    if (h24 === 12) return ['PM'];
    return ['AM', 'PM'];
  };

  const handleHourSelect = (h24: number) => {
    const allowed = allowedAMPM(h24);
    let ap = apStr;
    if (!allowed.includes(ap)) ap = allowed[0];
    const newMin = mn || '00';
    onChange(`${String(h24).padStart(2, '0')}:${newMin}`);
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${String(hr24).padStart(2, '0')}:${m}`);
    setOpen(false);
  };

  const handleAMPMSelect = (ap: string) => {
    let h24 = displayHr;
    if (ap === 'PM' && h24 !== 12) h24 += 12;
    if (ap === 'AM' && h24 === 12) h24 = 0;
    const newMin = mn || '00';
    onChange(`${String(h24).padStart(2, '0')}:${newMin}`);
  };

  const allowedAPs = allowedAMPM(hr24);

  return (
    <div className="timepicker" ref={ref}>
      <button
        type="button"
        className="timepicker-input"
        onClick={() => setOpen((s) => !s)}
        id={id}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="tp-value">{value || '--:--'}</span>
        <span className="tp-indicator" aria-hidden>
          🕒
        </span>
      </button>

      {open && (
        <div className="timepicker-dropdown" role="dialog" aria-label={label ?? 'Time picker'}>
          <div className="tp-col tp-hours">
            <div className="tp-col-label">Hour</div>
            <div className="tp-list">
              {hours24.map((h24) => (
                <button
                  key={h24}
                  type="button"
                  className={`tp-item ${hr24 === h24 ? 'selected' : ''}`}
                  onClick={() => handleHourSelect(h24)}
                >
                  {String(h24).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-col tp-minutes">
            <div className="tp-col-label">Minute</div>
            <div className="tp-list">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`tp-item ${mn === m ? 'selected' : ''}`}
                  onClick={() => handleMinuteSelect(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-col tp-ampm">
            <div className="tp-col-label">Period</div>
            <div className="tp-list">
              {['AM', 'PM'].map((ap) => (
                <button
                  key={ap}
                  type="button"
                  disabled={!allowedAPs.includes(ap)}
                  className={`tp-item ${apStr === ap ? 'selected' : ''}`}
                  onClick={() => handleAMPMSelect(ap)}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-actions">
            <button
              type="button"
              className="tp-clear"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="tp-ok"
              onClick={() => {
                setOpen(false);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LineItemCodesClient() {
  const supabase = getSupabaseClient();

  const [items, setItems] = useState<LineItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: '',
    category: '',
    description: '',
    maxRate: '',
    billedRate: '',
  });

  const [activeTimeFrames, setActiveTimeFrames] = useState<string[]>([]);
  const activeOptions = ['Night rate', 'Day rate', 'Evening rate'];

  const [specialFlag, setSpecialFlag] = useState<'Sleepover' | 'Public Holiday' | null>(null);

  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');

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

  // Auto-set times based on special flag
  useEffect(() => {
    if (specialFlag === 'Public Holiday') {
      setTimeFrom('00:00');
      setTimeTo('00:00');
    } else if (specialFlag === 'Sleepover') {
      setTimeFrom('01:00');
      setTimeTo('09:00');
    }
  }, [specialFlag]);

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

  const activeError = formVisible && activeTimeFrames.length === 0 ? 'Select at least one time frame' : '';

  const timeError = (() => {
    if (!formVisible || !timeFrom || !timeTo) return '';
    
    // Allow timeTo = 00:00 (next day)
    if (timeTo === '00:00') return '';
    
    // If both are 00:00, it's a 24hr span - valid
    if (timeFrom === '00:00' && timeTo === '00:00') return '';
    
    // Otherwise timeFrom must be < timeTo
    return timeFrom >= timeTo ? 'Time from must be before Time to' : '';
  })();

  const isAddDisabled =
    form.code.trim() === '' ||
    !codeIsValid ||
    form.category.trim() === '' ||
    max === null ||
    billed === null ||
    !Number.isFinite(max) ||
    !Number.isFinite(billed) ||
    max <= 0 ||
    (offset !== null && offset > 0) ||
    !!timeError;

  const toggleActiveFrame = (opt: string) => {
    setActiveTimeFrames((prev) => (prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]));
  };

  const resetForm = () => {
    setForm({ code: '', category: '', description: '', maxRate: '', billedRate: '' });
    setSpecialFlag(null);
    setTimeFrom('');
    setTimeTo('');
  };

  const handleAdd = async () => {
    if (isAddDisabled) return;

    // Auto-populate times based on flag
    let finalTimeFrom = timeFrom;
    let finalTimeTo = timeTo;
    
    if (specialFlag === 'Public Holiday') {
      finalTimeFrom = '00:00';
      finalTimeTo = '00:00';
    } else if (specialFlag === 'Sleepover') {
      finalTimeFrom = '01:00';
      finalTimeTo = '09:00';
    }

    const newItem = {
      code: form.code,
      category: form.category,
      description: form.description || null,
      sleepover: specialFlag === 'Sleepover' ? true : false,
      public_holiday: specialFlag === 'Public Holiday' ? true : false,
      time_from: finalTimeFrom || null,
      time_to: finalTimeTo || null,
      max_rate: max as number,
      billed_rate: billed as number,
      rate_offset: offset ?? 0,
    } as any;

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
    resetForm();
  };

  const handleEdit = (item: LineItem) => {
    setEditingId(item.id as number);
    setForm({
      code: item.code || '',
      category: item.category || '',
      description: item.description || '',
      maxRate: item.max_rate?.toString() || '',
      billedRate: item.billed_rate?.toString() || '',
    });
    setSpecialFlag(item.sleepover ? 'Sleepover' : item.public_holiday ? 'Public Holiday' : null);
    setTimeFrom(item.time_from || '');
    setTimeTo(item.time_to || '');
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (isAddDisabled || !editingId) return;

    // Auto-populate times based on flag
    let finalTimeFrom = timeFrom;
    let finalTimeTo = timeTo;
    
    if (specialFlag === 'Public Holiday') {
      finalTimeFrom = '00:00';
      finalTimeTo = '00:00';
    } else if (specialFlag === 'Sleepover') {
      finalTimeFrom = '01:00';
      finalTimeTo = '09:00';
    }

    const updatedItem = {
      code: form.code,
      category: form.category,
      description: form.description || null,
      sleepover: specialFlag === 'Sleepover',
      public_holiday: specialFlag === 'Public Holiday',
      time_from: finalTimeFrom || null,
      time_to: finalTimeTo || null,
      max_rate: max as number,
      billed_rate: billed as number,
      rate_offset: offset ?? 0,
    };

    const res = (await supabase
      .from('line_items')
      .update(updatedItem)
      .eq('id', editingId)
      .select()) as {
      data: LineItem[] | null;
      error: any;
    };

    const { data, error } = res;
    if (error) {
      console.error('Update error:', error);
      alert(`Update failed: ${error.message}`);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === editingId ? data![0] : item))
    );

    setFormVisible(false);
    setEditingId(null);
    resetForm();
  };

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

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = items.findIndex((it) => it.id === draggedId);
    const targetIndex = items.findIndex((it) => it.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    [newItems[draggedIndex], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[draggedIndex],
    ];
    setItems(newItems);
    setDraggedId(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Line Item Codes</h1>

      <button onClick={() => setFormVisible(true)}>Add line item code</button>

      {formVisible && (
        <div className="form-table" style={{ marginTop: 12 }}>
          <label htmlFor="code" className="label">
            Line Item Code
          </label>
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

          <label htmlFor="category" className="label">
            Category
          </label>
          <div className="control">
            <select
              id="category"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="">Select category</option>
              <option value="CORE">CORE</option>
              <option value="Home and Living">Home and Living</option>
              <option value="Access Community Social and Rec Activities">
                Access Community Social and Rec Activities
              </option>
            </select>
          </div>

          <label htmlFor="description" className="label">
            Description
          </label>
          <div className="control description-control">
            <input
              id="description"
              type="text"
              placeholder="To be shown on the invoice"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <label className="label">Special flag</label>
          <div className="control special-options">
            <label className="special-option">
              <input
                type="checkbox"
                className="special-checkbox"
                checked={specialFlag === 'Sleepover'}
                onChange={() =>
                  setSpecialFlag((s) => (s === 'Sleepover' ? null : 'Sleepover'))
                }
              />
              <span className="special-label">Sleepover</span>
            </label>

            <label className="special-option">
              <input
                type="checkbox"
                className="special-checkbox"
                checked={specialFlag === 'Public Holiday'}
                onChange={() =>
                  setSpecialFlag((s) =>
                    s === 'Public Holiday' ? null : 'Public Holiday'
                  )
                }
              />
              <span className="special-label">Public Holiday</span>
            </label>

            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 6 }}>
              (Only one or none allowed)
            </div>
          </div>

          {/* Conditionally hide time fields when flag is set */}
          {!specialFlag && (
            <>
              <label htmlFor="timeFrom" className="label">
                Time from
              </label>
              <div className="control">
                <TimePicker id="timeFrom" value={timeFrom} onChange={setTimeFrom} label="Time from" />
              </div>

              <label htmlFor="timeTo" className="label">
                Time to
              </label>
              <div className="control">
                <TimePicker id="timeTo" value={timeTo} onChange={setTimeTo} label="Time to" />
              </div>

              {timeError && (
                <div style={{ gridColumn: '1 / -1', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  {timeError}
                </div>
              )}
            </>
          )}

          <label htmlFor="maxRate" className="label">
            Max Rate
          </label>
          <div className="control small-control">
            <input
              id="maxRate"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={form.maxRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, maxRate: e.target.value })
              }
            />
            {maxError && <div className="field-error">{maxError}</div>}
          </div>

          <label htmlFor="billedRate" className="label">
            Billed Rate
          </label>
          <div className="control small-control">
            <input
              id="billedRate"
              placeholder="0.00"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={form.billedRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, billedRate: e.target.value })
              }
            />
            {billedError && <div className="field-error">{billedError}</div>}
          </div>

          <label className="label">Offset</label>
          <div className="control">
            <span style={{ color: offsetColor }}>
              {offset !== null ? `${offset.toFixed(2)}%` : '—'}
            </span>
          </div>

          <div></div>
          <div className="actions">
            <button
              disabled={isAddDisabled}
              onClick={editingId ? handleUpdate : handleAdd}
            >
              {editingId ? 'Update' : 'Add'}
            </button>
            <button
              className="ghost"
              onClick={() => {
                setFormVisible(false);
                setEditingId(null);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="records-table" role="table" aria-label="Line items">
          <div className="records-header" role="row">
            <div role="columnheader">Seq</div>
            <div role="columnheader">Line Item Code</div>
            <div role="columnheader">Category</div>
            <div role="columnheader">Description</div>
            <div role="columnheader">Time From</div>
            <div role="columnheader">Time To</div>
            <div role="columnheader">Max Rate</div>
            <div role="columnheader">Billed Rate</div>
            <div role="columnheader">Sleepover</div>
            <div role="columnheader">Public Holiday</div>
            <div role="columnheader" style={{ justifySelf: 'end' }}>
              Actions
            </div>
          </div>

          <div className="records-body" role="rowgroup">
            {items.length === 0 ? (
              <div className="no-records">No line items</div>
            ) : (
              <>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`row ${draggedId === item.id ? 'dragging' : ''}`}
                    role="row"
                    draggable
                    onDragStart={() => handleDragStart(item.id as number)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(item.id as number)}
                  >
                    <div className="cell seq">{idx + 1}</div>
                    <div className="cell">{item.code}</div>
                    <div className="cell">{item.category}</div>
                    <div className="cell desc-cell">{item.description ?? '—'}</div>
                    <div className="cell">{item.time_from ?? '—'}</div>
                    <div className="cell">{item.time_to ?? '—'}</div>
                    <div className="cell">{item.max_rate ?? '—'}</div>
                    <div className="cell">{item.billed_rate ?? '—'}</div>
                    <div className="cell">{item.sleepover ? 'Yes' : 'No'}</div>
                    <div className="cell">{item.public_holiday ? 'Yes' : 'No'}</div>
                    <div className="cell actions-cell">
                      <button
                        className="edit-btn"
                        title="Edit"
                        onClick={() => handleEdit(item)}
                      >
                        ✏️
                      </button>
                      <button
                        className="trash"
                        title="Delete"
                        onClick={() => handleDelete(item.id as number)}
                      >
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