'use client';

import React, { useEffect, useState, useRef } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { Database } from '../lib/types/supabase';

type LineItem = Database['public']['Tables']['line_items']['Row'];
type LineItemCategory = Database['public']['Tables']['line_item_categories']['Row'];

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
                  className={`tp-item ${displayHr === h24 ? 'selected' : ''}`}
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
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<LineItem[]>([]);
  const [categories, setCategories] = useState<LineItemCategory[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: '',
    category: '',
    description: '',
    maxRate: '',
    billedRate: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
  });

  const [activeTimeFrames, setActiveTimeFrames] = useState<string[]>([]);
  const activeOptions = ['Night rate', 'Day rate', 'Evening rate'];

  const [weekdayType, setWeekdayType] = useState<'weekday' | 'saturday' | 'sunday'>('weekday');
  const [isSleepover, setIsSleepover] = useState(false);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);

  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');

  // Fetch line items
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const res = (await supabase.from('line_items').select('*').eq('user_id', user.id)) as {
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

  // Fetch categories
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const res = (await supabase.from('line_item_categories').select('*').eq('user_id', user.id).order('name', { ascending: true })) as {
        data: LineItemCategory[] | null;
        error: any;
      };
      if (!mounted) return;
      const { data, error } = res;
      if (error) {
        console.error('Fetch categories error:', error);
      } else {
        setCategories(data ?? []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // For sleepover, public holiday, or weekend line items, times are not applicable
  useEffect(() => {
    if (isSleepover || isPublicHoliday || weekdayType === 'saturday' || weekdayType === 'sunday') {
      setTimeFrom('');
      setTimeTo('');
    }
  }, [isSleepover, isPublicHoliday, weekdayType]);

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
    if (!formVisible) return '';
    // Skip validation when time inputs are hidden (Sleepover, Public Holiday, or weekend)
    if (isSleepover || isPublicHoliday || weekdayType === 'saturday' || weekdayType === 'sunday') return '';
    if (!timeFrom || !timeTo) return '';
    
    // Normalize time strings (remove seconds if present)
    const normalizeTime = (time: string) => time.split(':').slice(0, 2).join(':');
    const fromNorm = normalizeTime(timeFrom);
    const toNorm = normalizeTime(timeTo);
    
    // If both are 00:00, it's a 24hr span - valid
    if (fromNorm === '00:00' && toNorm === '00:00') return '';
    
    // Allow timeTo = 00:00 (next day) when timeFrom is not 00:00
    if (toNorm === '00:00' && fromNorm !== '00:00') return '';
    
    // Otherwise timeFrom must be < timeTo
    return fromNorm >= toNorm ? 'Time from must be before Time to (use 00:00 to 00:00 for 24 hours)' : '';
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
    setWeekdayType('weekday');
    setIsSleepover(false);
    setIsPublicHoliday(false);
    setTimeFrom('');
    setTimeTo('');
  };

  const handleAdd = async () => {
    if (isAddDisabled) return;

    // Sleepover, Public Holiday, and weekend line items do not use time windows
    let finalTimeFrom = timeFrom;
    let finalTimeTo = timeTo;
    if (isSleepover || isPublicHoliday || weekdayType === 'saturday' || weekdayType === 'sunday') {
      finalTimeFrom = '';
      finalTimeTo = '';
    }

    const sleepoverFlag = isSleepover;
    const publicHolidayFlag = isPublicHoliday;

    const newItem = {
      code: form.code,
      category: form.category,
      description: form.description || null,
      sleepover: sleepoverFlag,
      public_holiday: publicHolidayFlag,
      weekday: !publicHolidayFlag && weekdayType === 'weekday',
      saturday: !publicHolidayFlag && weekdayType === 'saturday',
      sunday: !publicHolidayFlag && weekdayType === 'sunday',
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
    setWeekdayType(item.saturday ? 'saturday' : item.sunday ? 'sunday' : 'weekday');
    setIsSleepover(!!item.sleepover);
    setIsPublicHoliday(!!item.public_holiday);
    setTimeFrom(item.time_from || '');
    setTimeTo(item.time_to || '');
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (isAddDisabled || !editingId) return;

    // Sleepover, Public Holiday, and weekend line items do not use time windows
    let finalTimeFrom = timeFrom;
    let finalTimeTo = timeTo;
    if (isSleepover || isPublicHoliday || weekdayType === 'saturday' || weekdayType === 'sunday') {
      finalTimeFrom = '';
      finalTimeTo = '';
    }

    const sleepoverFlag = isSleepover;
    const publicHolidayFlag = isPublicHoliday;

    const updatedItem = {
      code: form.code,
      category: form.category,
      description: form.description || null,
      sleepover: sleepoverFlag,
      public_holiday: publicHolidayFlag,
      weekday: !publicHolidayFlag && weekdayType === 'weekday',
      saturday: !publicHolidayFlag && weekdayType === 'saturday',
      sunday: !publicHolidayFlag && weekdayType === 'sunday',
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

  // Category handlers
  const handleCategorySave = async () => {
    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) return;
    
    // Validate alphanumeric (allow spaces)
    const alphanumericPattern = /^[a-zA-Z0-9\s]+$/;
    if (!alphanumericPattern.test(trimmedName)) {
      alert('Category name must contain only letters, numbers, and spaces');
      return;
    }

    // Check for reserved name
    if (trimmedName.toUpperCase() === 'HIREUP') {
      alert('This category name is reserved, please use another one');
      return;
    }

    // Check for duplicate name (excluding current category when editing)
    const isDuplicate = categories.some(
      cat => cat.name.toLowerCase() === trimmedName.toLowerCase() && cat.id !== editingCategoryId
    );
    if (isDuplicate) {
      alert('A category with this name already exists, please use another one');
      return;
    }

    if (editingCategoryId) {
      // Update existing category
      const { data, error } = await supabase
        .from('line_item_categories')
        .update({ name: trimmedName })
        .eq('id', editingCategoryId)
        .select();

      if (error) {
        console.error('Update category error:', error);
        alert(`Update failed: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setCategories((prev) =>
          prev.map((cat) => (cat.id === editingCategoryId ? data[0] : cat)).sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } else {
      // Insert new category
      const { data, error } = await supabase
        .from('line_item_categories')
        .insert([{ name: trimmedName }])
        .select();

      if (error) {
        console.error('Insert category error:', error);
        alert(`Insert failed: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setCategories((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }

    setCategoryFormVisible(false);
    setEditingCategoryId(null);
    setCategoryForm({ name: '' });
  };

  const handleCategoryEdit = (category: LineItemCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name });
    setCategoryFormVisible(true);
  };

  const handleCategoryDelete = async (id: number) => {
    if (!confirm('Delete this category? Note: Line items using this category will not be affected.')) return;
    const { error } = await supabase.from('line_item_categories').delete().eq('id', id);
    if (error) {
      console.error('Delete category error:', error);
      alert('Delete failed');
      return;
    }
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
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
      {/* Categories Section */}
      <h1>Line Item Codes Categories</h1>
      
      <button onClick={() => { setCategoryFormVisible(true); setEditingCategoryId(null); setCategoryForm({ name: '' }); }}>
        Add line item code category
      </button>

      {categoryFormVisible && (
        <div className="form-table" style={{ marginTop: 12, marginBottom: 24 }}>
          <label htmlFor="categoryName" className="label">
            Category Name
          </label>
          <div className="control">
            <input
              id="categoryName"
              placeholder="e.g. CORE"
              value={categoryForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setCategoryForm({ name: e.target.value })
              }
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={handleCategorySave}>
              {editingCategoryId ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFormVisible(false);
                setEditingCategoryId(null);
                setCategoryForm({ name: '' });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="categories-table" style={{ marginTop: 16, marginBottom: 32 }}>
          <div className="categories-header">
            <div>Seq</div>
            <div>Category Name</div>
            <div>Actions</div>
          </div>
          {categories
            .slice()
            .sort((a, b) => {
              // HIREUP always at the bottom
              if (a.name === 'HIREUP') return 1;
              if (b.name === 'HIREUP') return -1;
              return a.name.localeCompare(b.name);
            })
            .map((category, idx) => (
            <div 
              key={category.id} 
              className={`categories-row ${category.name === 'HIREUP' ? 'readonly' : ''}`}
            >
              <div>{idx + 1}</div>
              <div>{category.name}</div>
              <div>
                {category.name !== 'HIREUP' && (
                  <>
                    <button
                      className="edit-btn"
                      title="Edit"
                      onClick={() => handleCategoryEdit(category)}
                    >
                      ✏️
                    </button>
                    <button
                      className="trash"
                      title="Delete"
                      onClick={() => handleCategoryDelete(category.id)}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Line Items Section */}
      <h1 style={{ marginTop: 32 }}>Line Item Codes</h1>

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
              {categories.filter(cat => cat.name !== 'HIREUP').map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
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

          {!isPublicHoliday && (
            <>
              <label className="label">Weekday type</label>
              <div className="control weekday-options">
                <label className="weekday-option">
                  <input
                    type="radio"
                    name="weekdayType"
                    value="weekday"
                    checked={weekdayType === 'weekday'}
                    onChange={(e) => setWeekdayType(e.target.value as 'weekday' | 'saturday' | 'sunday')}
                  />
                  <span className="weekday-label">Weekday</span>
                </label>

                <label className="weekday-option">
                  <input
                    type="radio"
                    name="weekdayType"
                    value="saturday"
                    checked={weekdayType === 'saturday'}
                    onChange={(e) => setWeekdayType(e.target.value as 'weekday' | 'saturday' | 'sunday')}
                  />
                  <span className="weekday-label">Saturday</span>
                </label>

                <label className="weekday-option">
                  <input
                    type="radio"
                    name="weekdayType"
                    value="sunday"
                    checked={weekdayType === 'sunday'}
                    onChange={(e) => setWeekdayType(e.target.value as 'weekday' | 'saturday' | 'sunday')}
                  />
                  <span className="weekday-label">Sunday</span>
                </label>
              </div>
            </>
          )}

          <label className="label">Special flag</label>
          <div className="control special-options">
            <label className="special-option">
              <input
                type="checkbox"
                className="special-checkbox"
                checked={isSleepover}
                onChange={() => setIsSleepover((prev) => !prev)}
              />
              <span className="special-label">Sleepover</span>
            </label>

            <label className="special-option">
              <input
                type="checkbox"
                className="special-checkbox"
                checked={isPublicHoliday}
                onChange={() => setIsPublicHoliday((prev) => !prev)}
              />
              <span className="special-label">Public Holiday</span>
            </label>

            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 6 }}>
              (You may choose one or both)
            </div>
          </div>

          {/* Hide time fields for Sleepover, Public Holiday, and weekends */}
          {!isSleepover && !isPublicHoliday && weekdayType === 'weekday' && (
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

      {/* Line Items Table */}
      {items.length > 0 && (
        <div className="line-items-table" style={{ marginTop: 20 }}>
          {/* Header */}
          <div className="line-items-header">
            <div>Seq</div>
            <div>Line Item Code</div>
            <div>Category</div>
            <div>Description</div>
            <div>Weekday Type</div>
            <div>Time From</div>
            <div>Time To</div>
            <div>Max Rate</div>
            <div>Billed Rate</div>
            <div>Sleepover</div>
            <div>Public Holiday</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`line-items-row row ${draggedId === item.id ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(item.id as number)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(item.id as number)}
            >
              <div>{idx + 1}</div>
              <div>{item.code}</div>
              <div>{item.category}</div>
              <div>{item.description ?? '—'}</div>
              <div>{item.saturday ? 'Saturday' : item.sunday ? 'Sunday' : 'Weekday'}</div>
              <div>{item.time_from ?? '—'}</div>
              <div>{item.time_to ?? '—'}</div>
              <div>{item.max_rate ?? '—'}</div>
              <div>{item.billed_rate ?? '—'}</div>
              <div>{item.sleepover ? 'Yes' : 'No'}</div>
              <div>{item.public_holiday ? 'Yes' : 'No'}</div>
              <div>
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
        </div>
      )}

      <style jsx>{`
        .categories-table {
          display: grid;
          gap: 1px;
          background-color: var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .categories-header,
        .categories-row {
          display: grid;
          grid-template-columns: 60px 1fr 120px;
          gap: 1px;
          background-color: var(--surface);
          color: var(--text);
          font-size: 0.95rem;
        }
        
        .categories-header {
          font-weight: 600;
          background-color: var(--surface-accent);
          color: var(--text);
        }
        
        .categories-header > div,
        .categories-row > div {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          background-color: inherit;
          overflow-wrap: break-word;
          word-break: break-word;
          color: inherit;
        }
        
        .categories-row:hover {
          background-color: var(--surface-hover);
        }
        
        .categories-row.readonly {
          opacity: 0.5;
          color: #999;
        }
        
        .categories-row.readonly:hover {
          background-color: var(--surface);
          cursor: default;
        }
        
        .categories-row > div:last-child {
          justify-content: center;
          align-self: center;
        }
        
        .line-items-table {
          display: grid;
          gap: 1px;
          background-color: var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .line-items-header,
        .line-items-row {
          display: grid;
          grid-template-columns: 60px 160px 160px 1fr 100px 120px 120px 80px 80px 80px 100px 80px;
          gap: 1px;
          background-color: var(--surface);
          color: var(--text);
          font-size: 0.95rem;
        }
        
        .line-items-header {
          font-weight: 600;
          background-color: var(--surface-accent);
          color: var(--text);
        }
        
        .line-items-header > div,
        .line-items-row > div {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          background-color: inherit;
          overflow-wrap: break-word;
          word-break: break-word;
          color: inherit;
        }
        
        .line-items-row {
          cursor: grab;
        }
        
        .line-items-row:hover {
          background-color: var(--surface-hover);
        }
        
        .line-items-row:active {
          cursor: grabbing;
        }
        
        .line-items-row > div:last-child {
          justify-content: center;
          align-self: center;
        }
        
        .line-items-row.dragging {
          background-color: var(--surface-accent);
        }
      `}</style>
    </div>
  );
}