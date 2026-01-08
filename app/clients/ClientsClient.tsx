'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// Client type definition
interface Client {
  id?: number;
  first_name: string;
  last_name: string;
  ndis_number: number;
  address: string;
  created_at?: string;
}

// Form data interface
interface ClientForm {
  firstName: string;
  lastName: string;
  ndisNumber: string;
  address: string;
}

export default function ClientsClient() {
  const supabase = getSupabaseClient();
  const { user, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    client: Client | null
    associatedShifts: any[]
  }>({
    isOpen: false,
    client: null,
    associatedShifts: []
  });

  const [form, setForm] = useState<ClientForm>({
    firstName: '',
    lastName: '',
    ndisNumber: '',
    address: '',
  });

  // Validation functions
  const validateNdisNumber = (ndis: string): boolean => {
    const ndisRegex = /^\d+$/;
    return ndisRegex.test(ndis.trim());
  };

  // Form validation
  const firstNameError = form.firstName.trim() === '' ? 'First name is required' : '';
  const lastNameError = form.lastName.trim() === '' ? 'Last name is required' : '';
  const ndisError = form.ndisNumber.trim() !== '' && !validateNdisNumber(form.ndisNumber) 
    ? 'NDIS number must contain only digits' : '';

  const isFormValid = 
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.ndisNumber.trim() !== '' &&
    validateNdisNumber(form.ndisNumber) &&
    !ndisError;

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      ndisNumber: '',
      address: '',
    });
    setEditingId(null);
  };

  // Load clients from database
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setClients([]);
      return;
    }
    loadClients();
  }, [authLoading, user]);

  const loadClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('id');

      if (error) {
        console.error('Error loading clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleAdd = async () => {
    if (!isFormValid) return;
    if (!user) {
      alert('You must be signed in to add a client.');
      return;
    }
    if (!user.id) {
      alert('ERROR: User ID is not available. Please sign out and sign back in.');
      console.error('User ID missing:', { user, authLoading });
      return;
    }

    const clientData = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      ndis_number: parseInt(form.ndisNumber.trim()),
      address: form.address.trim(),
      user_id: user.id,
    };
    console.log('Inserting client with user_id:', clientData.user_id);

    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select();

    console.log('Client insert result:', { data, error, sentUserId: clientData.user_id });

    if (error) {
      console.error('Insert error:', error);
      alert('Failed to add client: ' + error.message);
      return;
    }

    if (data && data[0]) {
      console.log('Client inserted, user_id in response:', data[0].user_id);
      setClients(prev => [...prev, data[0]]);
    }
    
    setFormVisible(false);
    resetForm();
  };

  const handleEdit = (client: Client) => {
    setForm({
      firstName: client.first_name,
      lastName: client.last_name,
      ndisNumber: client.ndis_number.toString(),
      address: client.address,
    });
    setEditingId(client.id!);
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (!isFormValid || !editingId) return;

    const clientData = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      ndis_number: parseInt(form.ndisNumber.trim()),
      address: form.address.trim(),
    };

    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', editingId)
      .select();

    if (error) {
      console.error('Update error:', error);
      alert('Failed to update client: ' + error.message);
      return;
    }

    if (data && data[0]) {
      setClients(prev => prev.map(client => 
        client.id === editingId ? data[0] : client
      ));
    }

    setFormVisible(false);
    resetForm();
  };

  const handleDelete = async (id: number) => {
    // Fetch associated shifts with carer information
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *,
        carers:carer_id(id, first_name, last_name)
      `)
      .eq('client_id', id);

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      alert('Failed to check for associated shifts');
      return;
    }

    const client = clients.find(c => c.id === id);
    if (!client) return;

    // Show delete confirmation dialog
    setDeleteConfirmDialog({
      isOpen: true,
      client,
      associatedShifts: shifts || []
    });
  };

  const handleConfirmDelete = async (id: number) => {
    try {
      // Delete all associated shifts first
      const { error: shiftsError } = await supabase
        .from('shifts')
        .delete()
        .eq('client_id', id);

      if (shiftsError) {
        console.error('Error deleting shifts:', shiftsError);
        alert('Failed to delete associated shifts');
        return;
      }

      // Then delete the client
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (clientError) {
        console.error('Error deleting client:', clientError);
        alert('Failed to delete client');
        return;
      }

      // Update UI
      setClients(prev => prev.filter(client => client.id !== id));
      setDeleteConfirmDialog({
        isOpen: false,
        client: null,
        associatedShifts: []
      });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('shiftsDeleted'));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancel = () => {
    setFormVisible(false);
    resetForm();
  };

  // Drag and drop functions
  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = clients.findIndex((client) => client.id === draggedId);
    const targetIndex = clients.findIndex((client) => client.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newClients = [...clients];
    [newClients[draggedIndex], newClients[targetIndex]] = [
      newClients[targetIndex],
      newClients[draggedIndex],
    ];
    setClients(newClients);
    setDraggedId(null);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Clients</h1>
      <button
        onClick={() => {
          setFormVisible(true);
          setEditingId(null);
          resetForm();
        }}
        style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}
      >
        Add Client
      </button>

      {formVisible && (
        <div className="form-table" style={{ marginTop: 12 }}>
          <label htmlFor="firstName" className="label">
            First Name
          </label>
          <div className="control">
            <input
              id="firstName"
              type="text"
              placeholder="Enter first name"
              value={form.firstName}
              onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
            />
            {firstNameError && <div className="field-error">{firstNameError}</div>}
          </div>

          <label htmlFor="lastName" className="label">
            Last Name
          </label>
          <div className="control">
            <input
              id="lastName"
              type="text"
              placeholder="Enter last name"
              value={form.lastName}
              onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
            />
            {lastNameError && <div className="field-error">{lastNameError}</div>}
          </div>

          <label htmlFor="ndisNumber" className="label">
            NDIS Number
          </label>
          <div className="control">
            <input
              id="ndisNumber"
              type="number"
              placeholder="Enter NDIS number"
              value={form.ndisNumber}
              onChange={(e) => setForm(prev => ({ ...prev, ndisNumber: e.target.value }))}
            />
            {ndisError && <div className="field-error">{ndisError}</div>}
          </div>

          <label htmlFor="address" className="label">
            Address
          </label>
          <div className="control">
            <textarea
              id="address"
              placeholder="Enter full address"
              value={form.address}
              rows={3}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={!isFormValid}
            >
              {editingId ? 'Update Client' : 'Add Client'}
            </button>
            <button onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {clients.length > 0 && (
        <div className="clients-table" style={{ marginTop: '2rem' }}>
          {/* Header */}
          <div className="clients-header">
            <div>Seq</div>
            <div>Name</div>
            <div>NDIS Number</div>
            <div>Address</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {clients.map((client, index) => (
            <div
              key={client.id}
              className="clients-row row"
              draggable
              onDragStart={() => handleDragStart(client.id!)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(client.id!)}
              style={{
                backgroundColor: draggedId === client.id ? 'var(--surface-accent)' : undefined,
              }}
            >
              <div>{index + 1}</div>
              <div>{`${client.first_name} ${client.last_name}`}</div>
              <div>{client.ndis_number}</div>
              <div style={{ fontSize: '0.9em' }}>{client.address}</div>
              <div>
                <button
                  className="edit-btn"
                  title="Edit"
                  onClick={() => handleEdit(client)}
                >
                  ✏️
                </button>
                <button
                  className="trash"
                  title="Delete"
                  onClick={() => handleDelete(client.id!)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .clients-table {
          display: grid;
          gap: 1px;
          background-color: var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .clients-header,
        .clients-row {
          display: grid;
          grid-template-columns: 50px minmax(150px, 1fr) minmax(120px, 0.8fr) minmax(200px, 2fr) 120px;
          gap: 1px;
          background-color: var(--surface);
        }
        
        .clients-header {
          font-weight: 600;
          background-color: var(--surface-accent);
        }
        
        .clients-header > div,
        .clients-row > div {
          padding: 12px 8px;
          display: flex;
          align-items: center;
          background-color: inherit;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        
        .clients-row {
          cursor: grab;
        }
        
        .clients-row:hover {
          background-color: var(--surface-hover);
        }
        
        .clients-row:active {
          cursor: grabbing;
        }
        
        .clients-row > div:last-child {
          justify-content: center;
          align-self: center;
        }
        
        @media (max-width: 1200px) {
          .clients-header,
          .clients-row {
            grid-template-columns: 40px minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(150px, 1.5fr) 100px;
            font-size: 0.9em;
          }
        }
        
        @media (max-width: 900px) {
          .clients-header,
          .clients-row {
            grid-template-columns: 30px 1fr 0.8fr 1.5fr 80px;
            font-size: 0.8em;
          }
        }
      `}</style>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog.isOpen && deleteConfirmDialog.client && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>Delete Client: {deleteConfirmDialog.client.first_name} {deleteConfirmDialog.client.last_name}</h2>
            
            {deleteConfirmDialog.associatedShifts.length > 0 ? (
              <div>
                <p>This client has {deleteConfirmDialog.associatedShifts.length} associated shift(s):</p>
                <div className="shifts-list">
                  {deleteConfirmDialog.associatedShifts.map((shift: any) => (
                    <div key={shift.id} className="shift-item">
                      <span>
                        {new Date(shift.shift_date).toLocaleDateString()} - {shift.category || shift.shift_type || 'No type'} 
                        {shift.carers && ` (${shift.carers.first_name} ${shift.carers.last_name})`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="warning-text">If you proceed, this client and all associated shifts will be permanently deleted.</p>
              </div>
            ) : (
              <p>This client has no associated shifts.</p>
            )}
            
            <div className="modal-buttons">
              <button 
                onClick={() => setDeleteConfirmDialog({ isOpen: false, client: null, associatedShifts: [] })}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleConfirmDelete(deleteConfirmDialog.client!.id!)}
                className="btn-delete"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-dialog {
          background: var(--surface);
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-dialog h2 {
          margin-top: 0;
          margin-bottom: 16px;
          color: var(--text);
        }

        .modal-dialog p {
          margin: 12px 0;
          color: var(--text-secondary);
          font-size: 0.95em;
        }

        .warning-text {
          color: #ef4444 !important;
          font-weight: 500;
        }

        .shifts-list {
          background-color: var(--surface-accent);
          border-radius: 4px;
          padding: 12px;
          margin: 12px 0;
          max-height: 300px;
          overflow-y: auto;
        }

        .shift-item {
          padding: 8px;
          border-bottom: 1px solid var(--border);
          font-size: 0.9em;
          color: var(--text);
        }

        .shift-item:last-child {
          border-bottom: none;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .btn-cancel, .btn-delete {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 500;
        }

        .btn-cancel {
          background-color: var(--surface-accent);
          color: var(--text);
        }

        .btn-cancel:hover {
          background-color: var(--border);
        }

        .btn-delete {
          background-color: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background-color: #dc2626;
        }
      `}</style>
    </div>
  );
}