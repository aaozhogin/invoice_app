'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

interface Shift {
  id: number
  time_from: string
  time_to: string
  carer_id: number
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
}

interface CostBreakdownItem {
  description: string
  code: string
  rate: number
  hours: number
  cost: number
}

export default function ShiftsClient() {
  const supabase = getSupabaseClient();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [carers, setCarers] = useState<Carer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lineItemCodes, setLineItemCodes] = useState<LineItemCode[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
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
  });

  // Load data from database
  useEffect(() => {
    loadShifts();
    loadCarers();
    loadClients();
    loadLineItemCodes();
  }, []);

  const loadShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `)
        .order('time_from', { ascending: false });

      if (error) {
        console.error('Error loading shifts:', error);
        return;
      }

      // Manually join clients data with shifts since client_id column might be missing
      const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
      
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
    try {
      const { data, error } = await supabase.from('carers').select('*').order('first_name');
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
    try {
      const { data, error } = await supabase.from('clients').select('*').order('first_name');
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
    try {
      const { data, error } = await supabase.from('line_items').select('*');
      if (error) {
        console.error('Error loading line item codes:', error);
        return;
      }
      setLineItemCodes(data || []);
      
      // Extract unique categories
      const categorySet = new Set((data || []).map(item => item.category).filter(Boolean));
      const uniqueCategories = Array.from(categorySet);
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

    try {
      // Find the line item for the selected category
      const lineItem = lineItemCodes.find(li => li.category === form.category);
      if (!lineItem) {
        setError('Selected category not found');
        return;
      }

      // Prepare the shift data with proper TIMESTAMPTZ format
      const startDateTime = `${form.shiftDate}T${form.timeFrom}:00`;
      let endDateTime = `${form.shiftDate}T${form.timeTo}:00`;

      // Handle overnight shifts
      const [startHour, startMin] = form.timeFrom.split(':').map(Number);
      const [endHour, endMin] = form.timeTo.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        // This is an overnight shift, add one day to the end time
        const nextDay = new Date(form.shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        endDateTime = `${nextDayStr}T${form.timeTo}:00`;
      }

      const totalCost = getTotalCost();

      const shiftData = {
        shift_date: form.shiftDate,
        time_from: startDateTime,
        time_to: endDateTime,
        carer_id: parseInt(form.carerId),
        line_item_code_id: lineItem.id,
        cost: totalCost
        // Note: client_id is commented out since the column doesn't exist in the database yet
        // client_id: form.clientId ? parseInt(form.clientId) : null,
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

    setForm({
      shiftDate: shift.shift_date,
      timeFrom: fromTimeString,
      timeTo: toTimeString,
      carerId: shift.carer_id.toString(),
      clientId: '', // Will be enabled once client_id column is added
      category: shift.line_items?.category || '',
    });
    setEditingId(shift.id);
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.carerId || !form.category) {
      setError('Please select carer and category');
      return;
    }

    try {
      const lineItem = lineItemCodes.find(li => li.category === form.category);
      if (!lineItem) {
        setError('Selected category not found');
        return;
      }

      const startDateTime = `${form.shiftDate}T${form.timeFrom}:00`;
      let endDateTime = `${form.shiftDate}T${form.timeTo}:00`;

      // Handle overnight shifts
      const [startHour, startMin] = form.timeFrom.split(':').map(Number);
      const [endHour, endMin] = form.timeTo.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        const nextDay = new Date(form.shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        endDateTime = `${nextDayStr}T${form.timeTo}:00`;
      }

      const totalCost = getTotalCost();

      const shiftData = {
        shift_date: form.shiftDate,
        time_from: startDateTime,
        time_to: endDateTime,
        carer_id: parseInt(form.carerId),
        line_item_code_id: lineItem.id,
        cost: totalCost
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

              <div className="form-row">
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
                <label>Customer:</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({...form, clientId: e.target.value})}
                  disabled
                  title="Client selection will be enabled once database schema is updated"
                >
                  <option value="">Select Customer (temporarily disabled)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>
                <small className="form-note">Client selection temporarily disabled due to database schema</small>
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

              {costBreakdown.length > 0 && (
                <div className="cost-breakdown">
                  <h3>Cost Breakdown</h3>
                  <table className="breakdown-table">
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
                        <td colSpan={3}><strong>Total:</strong></td>
                        <td><strong>${getTotalCost().toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => setFormVisible(false)}>Cancel</button>
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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time From</th>
              <th>Time To</th>
              <th>Carer</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map(shift => (
              <tr key={shift.id}>
                <td>{formatDate(shift.shift_date)}</td>
                <td>{formatDateTime(shift.time_from)}</td>
                <td>{formatDateTime(shift.time_to)}</td>
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
                <td>{shift.line_items?.category || 'N/A'}</td>
                <td>${shift.cost.toFixed(2)}</td>
                <td className="actions">
                  <button 
                    onClick={() => handleEdit(shift)}
                    className="edit-btn"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(shift.id)}
                    className="delete-btn"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={8} className="no-data">No shifts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
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
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
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
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }

        .breakdown-table th,
        .breakdown-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .breakdown-table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }

        .total-row {
          border-top: 2px solid #333;
          background-color: #f0f0f0;
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
      `}</style>
    </div>
  );
}