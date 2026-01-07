'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface Shift {
  id: number
  time_from: string
  time_to: string
  carer_id: number
  category?: string | null
  client_id?: number | null
  line_item_code_id: string | null
  cost: number
  shift_date: string
  created_at?: string
  updated_at?: string
  // Relations
  carers?: Carer
  clients?: Client
  line_items?: LineItemCode
}

interface Carer {
  id: number
  first_name: string
  last_name: string
  email?: string
  color?: string
}

interface Client {
  id: number
  first_name: string
  last_name: string
  ndis_number?: number
  address?: string
}

interface LineItemCode {
  id: string
  code?: string | null
  description: string | null
  category: string | null
  time_from?: string | null
  time_to?: string | null
  billed_rate?: number | null
  max_rate?: number | null
  weekday?: boolean | null
  saturday?: boolean | null
  sunday?: boolean | null
  sleepover?: boolean | null
}

interface ShiftForm {
  shiftDate: string
  timeFrom: string
  timeTo: string
  carerId: string
  clientId: string
  category: string
  hireupCost: string
}

interface CostBreakdownItem {
  description: string
  code: string
  rate: number
  hours: number
  cost: number
}

const formatDurationHours = (shift: Shift) => {
  const start = new Date(shift.time_from).getTime();
  const end = new Date(shift.time_to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '-';
  const hours = (end - start) / (1000 * 60 * 60);
  return hours.toFixed(2);
};

export default function ShiftsClient() {
  const supabase = getSupabaseClient();
  const { user, loading: authLoading } = useAuth();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [carers, setCarers] = useState<Carer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lineItemCodes, setLineItemCodes] = useState<LineItemCode[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('shift_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterCarer, setFilterCarer] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterLineItem, setFilterLineItem] = useState('');
  
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([]);

  const [form, setForm] = useState<ShiftForm>({
    shiftDate: new Date().toISOString().split('T')[0],
    timeFrom: '09:00',
    timeTo: '17:00',
    carerId: '',
    clientId: '',
    category: '',
    hireupCost: '',
  });

  // Load data from database
  useEffect(() => {
    loadShifts();
    loadCarers();
    loadClients();
    loadLineItemCodes();
  }, []);

  const loadShifts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `)
        .eq('user_id', user.id)
        .order('time_from', { ascending: false });

      if (error) {
        console.error('Error loading shifts:', error);
        return;
      }

      // Manually join clients data with shifts since client_id column might be missing
      const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*').eq('user_id', user.id);
      
      if (!clientsError && clientsData) {
        const clientsMap = new Map(clientsData.map(client => [client.id, client]));
        const shiftsWithClients = (data || []).map(shift => ({
          ...shift,
          clients: shift.client_id ? clientsMap.get(shift.client_id) : null
        }));
        setShifts(shiftsWithClients);
      } else {
        setShifts(data || []);
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  const loadCarers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('carers').select('*').eq('user_id', user.id).order('first_name');
      if (error) {
        console.error('Error loading carers:', error);
        return;
      }
      setCarers(data || []);
    } catch (error) {
      console.error('Error loading carers:', error);
    }
  };

  const loadClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('user_id', user.id).order('first_name');
      if (error) {
        console.error('Error loading clients:', error);
        return;
      }
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadLineItemCodes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('line_items').select('*').eq('user_id', user.id);
      if (error) {
        console.error('Error loading line item codes:', error);
        return;
      }
      setLineItemCodes(data || []);
      
      // Extract unique categories
      const categorySet = new Set((data || []).map(item => item.category).filter(Boolean));
      const uniqueCategories = Array.from(categorySet);
      if (!uniqueCategories.includes('HIREUP')) uniqueCategories.push('HIREUP');
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error loading line item codes:', error);
    }
  };

  const resetForm = () => {
    setForm({
      shiftDate: new Date().toISOString().split('T')[0],
      timeFrom: '09:00',
      timeTo: '17:00',
      carerId: '',
      clientId: '',
      category: '',
      hireupCost: '',
    });
    setEditingId(null);
    setCostBreakdown([]);
    setError(null);
  };

  const calculateCostBreakdown = () => {
    if (!form.timeFrom || !form.timeTo || !form.category || !form.shiftDate) {
      setCostBreakdown([]);
      return;
    }

    // HIREUP: manual cost entry
    if (form.category === 'HIREUP') {
      const costNum = Number(form.hireupCost);
      if (!Number.isFinite(costNum) || costNum <= 0) {
        setCostBreakdown([]);
        return;
      }
      setCostBreakdown([
        {
          description: 'HIREUP shift',
          code: 'HIREUP',
          rate: costNum,
          hours: 0,
          cost: costNum,
        },
      ]);
      return;
    }

    // Convert times to minutes for calculation
    const [startHour, startMin] = form.timeFrom.split(':').map(Number);
    const [endHour, endMin] = form.timeTo.split(':').map(Number);
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }

    const totalMinutes = endMinutes - startMinutes;
    const shiftDate = new Date(form.shiftDate);
    const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;

    // Filter line items for the selected category and applicable days
    const applicableLineItems = lineItemCodes.filter(item => {
      if (item.category !== form.category) return false;
      
      if (isWeekday && item.weekday) return true;
      if (isSaturday && item.saturday) return true;
      if (isSunday && item.sunday) return true;
      
      return false;
    });

    const breakdown: CostBreakdownItem[] = [];
    let remainingMinutes = totalMinutes;

    // Sort line items by time range (sleepover, night, evening, day)
    const sortedLineItems = applicableLineItems.sort((a, b) => {
      if (a.sleepover !== b.sleepover) return a.sleepover ? -1 : 1;
      const aStart = a.time_from ? timeStringToMinutes(a.time_from) : 0;
      const bStart = b.time_from ? timeStringToMinutes(b.time_from) : 0;
      return aStart - bStart;
    });

    for (const lineItem of sortedLineItems) {
      if (remainingMinutes <= 0) break;

      const itemStartMinutes = lineItem.time_from ? timeStringToMinutes(lineItem.time_from) : 0;
      const itemEndMinutes = lineItem.time_to ? timeStringToMinutes(lineItem.time_to) : 24 * 60;
      
      // Calculate overlap
      const overlapStart = Math.max(startMinutes % (24 * 60), itemStartMinutes);
      const overlapEnd = Math.min((startMinutes + totalMinutes) % (24 * 60), itemEndMinutes);
      
      if (overlapEnd > overlapStart) {
        const overlapMinutes = overlapEnd - overlapStart;
        const applicableMinutes = Math.min(overlapMinutes, remainingMinutes);
        const hours = applicableMinutes / 60;
        const rate = lineItem.billed_rate || 0;
        const cost = hours * rate;

        breakdown.push({
          description: lineItem.description || `${lineItem.category} - ${lineItem.code}`,
          code: lineItem.code || '',
          rate: rate,
          hours: hours,
          cost: cost
        });

        remainingMinutes -= applicableMinutes;
      }
    }

    setCostBreakdown(breakdown);
  };

  const timeStringToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Recalculate cost when form changes
  useEffect(() => {
    calculateCostBreakdown();
  }, [form.timeFrom, form.timeTo, form.category, form.shiftDate, lineItemCodes]);

  const getTotalCost = (): number => {
    return costBreakdown.reduce((total, item) => total + item.cost, 0);
  };

  const handleAdd = async () => {
    if (!form.carerId || !form.category) {
      setError('Please select carer and category');
      return;
    }

    if (form.category === 'HIREUP') {
      const costNum = Number(form.hireupCost);
      if (!Number.isFinite(costNum) || costNum <= 0) {
        setError('Enter a valid cost for HIREUP');
        return;
      }
    }

    try {
      // Find the line item for the selected category (skip for HIREUP)
      const lineItem = form.category === 'HIREUP'
        ? null
        : lineItemCodes.find(li => li.category === form.category);
      if (form.category !== 'HIREUP' && !lineItem) {
        setError('Selected category not found');
        return;
      }

      // Build local datetimes and send as ISO so DB stores correct instant
      const startLocal = new Date(`${form.shiftDate}T${form.timeFrom}:00`);
      let endLocal = new Date(`${form.shiftDate}T${form.timeTo}:00`);

      // Handle overnight shifts
      const [startHour, startMin] = form.timeFrom.split(':').map(Number);
      const [endHour, endMin] = form.timeTo.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        // This is an overnight shift, add one day to the end time
        endLocal.setDate(endLocal.getDate() + 1);
      }

      const totalCost = form.category === 'HIREUP' ? Number(form.hireupCost) : getTotalCost();

      const shiftData = {
        shift_date: form.shiftDate,
        time_from: startLocal.toISOString(),
        time_to: endLocal.toISOString(),
        carer_id: parseInt(form.carerId),
        line_item_code_id: lineItem ? lineItem.id : null,
        cost: totalCost,
        client_id: form.clientId ? parseInt(form.clientId) : null,
        category: form.category,
      };

      const { data, error } = await supabase.from('shifts').insert(shiftData).select();

      if (error) {
        console.error('Error adding shift:', error);
        setError(`Failed to add shift: ${error.message}`);
        return;
      }

      console.log('Shift added successfully:', data);
      resetForm();
      setFormVisible(false);
      loadShifts(); // Reload the shifts list
      setError(null);
    } catch (error) {
      console.error('Error adding shift:', error);
      setError('Failed to add shift');
    }
  };

  const handleEdit = (shift: Shift) => {
    // Convert UTC times back to local time for the form
    const fromTime = new Date(shift.time_from);
    const toTime = new Date(shift.time_to);
    
    const fromTimeString = fromTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    const toTimeString = toTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    const derivedCategory = shift.category || shift.line_items?.category || '';
    setForm({
      shiftDate: shift.shift_date,
      timeFrom: fromTimeString,
      timeTo: toTimeString,
      carerId: shift.carer_id.toString(),
      clientId: shift.client_id ? String(shift.client_id) : '',
      category: derivedCategory,
      hireupCost: derivedCategory === 'HIREUP' ? String(shift.cost || '') : '',
    });
    setEditingId(shift.id);
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.carerId || !form.category) {
      setError('Please select carer and category');
      return;
    }

    if (form.category === 'HIREUP') {
      const costNum = Number(form.hireupCost);
      if (!Number.isFinite(costNum) || costNum <= 0) {
        setError('Enter a valid cost for HIREUP');
        return;
      }
    }

    try {
      const lineItem = form.category === 'HIREUP'
        ? null
        : lineItemCodes.find(li => li.category === form.category);
      if (form.category !== 'HIREUP' && !lineItem) {
        setError('Selected category not found');
        return;
      }

      const startLocal = new Date(`${form.shiftDate}T${form.timeFrom}:00`);
      let endLocal = new Date(`${form.shiftDate}T${form.timeTo}:00`);

      // Handle overnight shifts
      const [startHour, startMin] = form.timeFrom.split(':').map(Number);
      const [endHour, endMin] = form.timeTo.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        endLocal.setDate(endLocal.getDate() + 1);
      }

      const totalCost = form.category === 'HIREUP' ? Number(form.hireupCost) : getTotalCost();

      const shiftData = {
        shift_date: form.shiftDate,
        time_from: startLocal.toISOString(),
        time_to: endLocal.toISOString(),
        carer_id: parseInt(form.carerId),
        line_item_code_id: lineItem ? lineItem.id : null,
        cost: totalCost,
        client_id: form.clientId ? parseInt(form.clientId) : null,
        category: form.category,
      };

      const { error } = await supabase
        .from('shifts')
        .update(shiftData)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating shift:', error);
        setError(`Failed to update shift: ${error.message}`);
        return;
      }

      resetForm();
      setFormVisible(false);
      loadShifts();
      setError(null);
    } catch (error) {
      console.error('Error updating shift:', error);
      setError('Failed to update shift');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) {
        console.error('Error deleting shift:', error);
        setError(`Failed to delete shift: ${error.message}`);
        return;
      }
      loadShifts();
      setError(null);
    } catch (error) {
      console.error('Error deleting shift:', error);
      setError('Failed to delete shift');
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedShifts = () => {
    const filtered = shifts.filter((s) => {
      const passesFrom = filterFrom ? new Date(s.shift_date) >= new Date(filterFrom) : true;
      const passesTo = filterTo ? new Date(s.shift_date) <= new Date(filterTo) : true;
      const passesCarer = filterCarer ? String(s.carer_id) === filterCarer : true;
      const passesClient = filterClient ? String(s.clients?.id || '') === filterClient : true;
      const passesLineItem = filterLineItem ? String(s.line_items?.code || '') === filterLineItem : true;
      return passesFrom && passesTo && passesCarer && passesClient && passesLineItem;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'shift_date':
          aValue = new Date(a.shift_date).getTime();
          bValue = new Date(b.shift_date).getTime();
          break;
        case 'time_from':
          aValue = new Date(a.time_from).getTime();
          bValue = new Date(b.time_from).getTime();
          break;
        case 'time_to':
          aValue = new Date(a.time_to).getTime();
          bValue = new Date(b.time_to).getTime();
          break;
        case 'carer':
          aValue = a.carers ? `${a.carers.first_name} ${a.carers.last_name}` : '';
          bValue = b.carers ? `${b.carers.first_name} ${b.carers.last_name}` : '';
          break;
        case 'client':
          aValue = a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : '';
          bValue = b.clients ? `${b.clients.first_name} ${b.clients.last_name}` : '';
          break;
        case 'category':
          aValue = a.category || a.line_items?.category || '';
          bValue = b.category || b.line_items?.category || '';
          break;
        case 'line_item_code':
          aValue = a.line_items?.code || '';
          bValue = b.line_items?.code || '';
          break;
        case 'description':
          aValue = a.line_items?.description || '';
          bValue = b.line_items?.description || '';
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const renderSortArrow = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Shifts</h1>
        <button 
          className="add-button"
          onClick={() => {
            resetForm();
            setFormVisible(true);
          }}
        >
          + Add Shift
        </button>
      </div>
      <style jsx>{`
        .page-header { margin-bottom: 12px; }
      `}</style>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {formVisible && (
        <div className="modal-overlay" onClick={() => setFormVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Shift' : 'Add New Shift'}</h2>
              <button onClick={() => setFormVisible(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={e => e.preventDefault()} className="form-content">
              <div className="form-group">
                <label>Shift Date:</label>
                <input
                  type="date"
                  value={form.shiftDate}
                  onChange={e => setForm({...form, shiftDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-row compact">
                <div className="form-group">
                  <label>Time From:</label>
                  <input
                    type="time"
                    value={form.timeFrom}
                    onChange={e => setForm({...form, timeFrom: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time To:</label>
                  <input
                    type="time"
                    value={form.timeTo}
                    onChange={e => setForm({...form, timeTo: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Carer:</label>
                <select
                  value={form.carerId}
                  onChange={e => setForm({...form, carerId: e.target.value})}
                  required
                >
                  <option value="">Select Carer</option>
                  {carers.map(carer => (
                    <option key={carer.id} value={carer.id}>
                      {carer.first_name} {carer.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Client:</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({...form, clientId: e.target.value})}
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Line Item Category:</label>
                <select
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {form.category === 'HIREUP' && (
                <div className="form-group">
                  <label>HIREUP Cost:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.hireupCost}
                    onChange={(e) => setForm({ ...form, hireupCost: e.target.value })}
                    placeholder="Enter cost"
                  />
                </div>
              )}

              {costBreakdown.length > 0 && (
                <div className="cost-breakdown">
                  <h3>Cost Breakdown</h3>
                  <table className="breakdown-table" border={0} style={{ border: 'none' }}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Rate</th>
                        <th>Hours</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costBreakdown.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>${item.rate.toFixed(2)}/hr</td>
                          <td>{item.hours.toFixed(2)}</td>
                          <td>${item.cost.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={3} style={{ borderRight: '1px solid #cbd5e1' }}><strong>Total:</strong></td>
                        <td style={{ borderRight: 'none', borderLeft: 'none' }}><strong>${getTotalCost().toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => setFormVisible(false)} className="secondary-btn">Cancel</button>
                <button 
                  type="button" 
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="primary-button"
                >
                  {editingId ? 'Update Shift' : 'Add Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="filters">
        <label>
          Date from
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </label>
        <label>
          Date to
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </label>
        <label>
          Carer
          <select value={filterCarer} onChange={(e) => setFilterCarer(e.target.value)}>
            <option value="">All</option>
            {carers.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </label>
        <label>
          Client
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </label>
        <label>
          Line item code
          <select value={filterLineItem} onChange={(e) => setFilterLineItem(e.target.value)}>
            <option value="">All</option>
            {Array.from(new Set(lineItemCodes.map((li) => li.code).filter(Boolean))).map((code) => (
              <option key={code as string} value={code as string}>{code as string}</option>
            ))}
          </select>
        </label>
        <button onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterCarer(''); setFilterClient(''); setFilterLineItem(''); }}>Clear filters</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('shift_date')} style={{ cursor: 'pointer' }}>
                Date{renderSortArrow('shift_date')}
              </th>
              <th onClick={() => handleSort('time_from')} style={{ cursor: 'pointer' }}>
                Time From{renderSortArrow('time_from')}
              </th>
              <th onClick={() => handleSort('time_to')} style={{ cursor: 'pointer' }}>
                Time To{renderSortArrow('time_to')}
              </th>
              <th>
                Duration (h)
              </th>
              <th onClick={() => handleSort('carer')} style={{ cursor: 'pointer' }}>
                Carer{renderSortArrow('carer')}
              </th>
              <th onClick={() => handleSort('client')} style={{ cursor: 'pointer' }}>
                Client{renderSortArrow('client')}
              </th>
              <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                Category{renderSortArrow('category')}
              </th>
              <th onClick={() => handleSort('line_item_code')} style={{ cursor: 'pointer' }}>
                Line Item Code{renderSortArrow('line_item_code')}
              </th>
              <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>
                Description{renderSortArrow('description')}
              </th>
              <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>
                Cost{renderSortArrow('cost')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedShifts().map(shift => (
              <tr key={shift.id}>
                <td>{formatDate(shift.shift_date)}</td>
                <td>{formatDateTime(shift.time_from)}</td>
                <td>{formatDateTime(shift.time_to)}</td>
                <td>{formatDurationHours(shift)}</td>
                <td>
                  {shift.carers && (
                    <div className="carer-info">
                      <span 
                        className="carer-color-dot"
                        style={{ backgroundColor: shift.carers.color || '#3b82f6' }}
                      ></span>
                      {shift.carers.first_name} {shift.carers.last_name}
                    </div>
                  )}
                </td>
                <td>
                  {shift.clients ? 
                    `${shift.clients.first_name} ${shift.clients.last_name}` : 
                    <span className="text-muted">Not assigned</span>
                  }
                </td>
                <td>{shift.category || shift.line_items?.category || 'N/A'}</td>
                <td>{shift.line_items?.code || 'N/A'}</td>
                <td>{shift.line_items?.description || 'N/A'}</td>
                <td>${shift.cost.toFixed(2)}</td>
                <td className="actions">
                  <button 
                    onClick={() => handleEdit(shift)}
                    className="edit-btn"
                    title="Edit"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(shift.id)}
                    className="delete-btn"
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={11} className="no-data">No shifts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .table-container {
          width: 100%;
          overflow-x: auto;
          margin: 20px 0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          table-layout: fixed;
        }

        .data-table thead {
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }

        .data-table th,
        .data-table td {
          padding: 12px 14px;
          text-align: left;
          color: var(--text);
          min-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .data-table th {
          font-weight: 600;
        }

        .data-table tbody tr {
          display: table-row;
        }

        .data-table tbody tr:hover {
          background-color: var(--card);
        }

        .data-table tbody tr:last-child td {
          border-bottom: none;
        }

        .data-table .actions {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: center;
          min-width: 200px;
          white-space: nowrap;
          overflow: visible;
        }

        .data-table td,
        .data-table th {
          line-height: 1.4;
        }

        .data-table td.actions {
          overflow: visible;
        }

        .data-table .edit-btn,
        .data-table .delete-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          font-size: 15px;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background-color 0.2s, border-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          opacity: 1;
          visibility: visible;
        }

        .data-table .edit-btn:hover {
          background-color: rgba(125, 211, 252, 0.12);
          border-color: rgba(125, 211, 252, 0.5);
        }

        .data-table .delete-btn:hover {
          background-color: rgba(251, 113, 133, 0.12);
          border-color: rgba(251, 113, 133, 0.5);
        }

        .data-table .no-data {
          text-align: center;
          padding: 20px;
          color: var(--muted);
          font-style: italic;
        }

        .carer-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .carer-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-row.compact {
          max-width: 460px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          column-gap: 12px;
        }

        .form-content {
          max-width: 840px;
        }

        .form-note {
          color: #666;
          font-size: 0.8em;
          display: block;
          margin-top: 4px;
        }

        .cost-breakdown {
          margin: 1rem 0;
          padding: 1rem;
          border: 1px solid #d0d7e2;
          border-radius: 8px;
          background-color: #ffffff;
          color: #0f172a;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
          border: none !important;
        }

        .breakdown-table th,
        .breakdown-table td {
          padding: 10px 12px;
          text-align: left;
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          color: #0f172a;
        }

        .breakdown-table th {
          background-color: #f5f7fb;
          font-weight: 700;
        }

        .total-row {
          border-top: 2px solid #cbd5e1;
          background-color: #eef2f8;
          font-weight: 700;
        }

        .total-row td:first-child {
          border-right: 1px solid #cbd5e1 !important;
        }

        .text-muted {
          color: #666;
          font-style: italic;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 1rem;
          border: 1px solid #fcc;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px 16px;
          margin: 16px 0 12px;
          align-items: end;
        }

        .filters label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .filters input,
        .filters select {
          width: 100%;
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
        }

        .filters button {
          width: 100%;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px 12px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .form-actions .secondary-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 6px;
        }

        .form-actions .primary-button {
          padding: 10px 14px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}