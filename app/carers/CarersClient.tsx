'use client';

import React, { useEffect, useState } from 'react';
import getSupabaseClient from '../lib/supabaseClient';
import { Database } from '../lib/types/supabase';

type Carer = Database['public']['Tables']['carers']['Row'];

interface CarerForm {
  firstName: string;
  lastName: string;
  address: string;
  phoneNumber: string;
  email: string;
  abn: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

export default function CarersClient() {
  const [carers, setCarers] = useState<Carer[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState<CarerForm>({
    firstName: '',
    lastName: '',
    address: '',
    phoneNumber: '',
    email: '',
    abn: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
  });

  const [supabase] = useState(() => getSupabaseClient());

  // Fetch carers on component mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await supabase.from('carers').select('*').order('last_name', { ascending: true });
      const { data, error } = res;
      if (error) {
        console.error('Fetch error:', error);
      } else if (mounted) {
        setCarers(data ?? []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Form validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9+\s\-()]+$/;
    return phoneRegex.test(phone);
  };

  const validateABN = (abn: string): boolean => {
    const abnRegex = /^[0-9\s]+$/;
    return abnRegex.test(abn);
  };

  const validateBSB = (bsb: string): boolean => {
    const bsbRegex = /^\d{6}$/;
    return bsbRegex.test(bsb.replace(/\s/g, ''));
  };

  const validateAccountNumber = (accountNumber: string): boolean => {
    return /^\d+$/.test(accountNumber);
  };

  // Validation errors
  const emailError = form.email.trim() !== '' && !validateEmail(form.email.trim()) 
    ? 'Please enter a valid email address' : '';
  
  const phoneError = form.phoneNumber.trim() !== '' && !validatePhone(form.phoneNumber.trim()) 
    ? 'Phone number can only contain digits, +, spaces, hyphens, and parentheses' : '';
  
  const abnError = form.abn.trim() !== '' && !validateABN(form.abn.trim()) 
    ? 'ABN can only contain numbers and spaces' : '';
  
  const bsbError = form.bsb.trim() !== '' && !validateBSB(form.bsb.trim()) 
    ? 'BSB must be exactly 6 digits' : '';
  
  const accountNumberError = form.accountNumber.trim() !== '' && !validateAccountNumber(form.accountNumber.trim()) 
    ? 'Account number must contain only digits' : '';

  const isFormValid = 
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.address.trim() !== '' &&
    form.phoneNumber.trim() !== '' &&
    form.email.trim() !== '' &&
    form.abn.trim() !== '' &&
    form.accountName.trim() !== '' &&
    form.bsb.trim() !== '' &&
    form.accountNumber.trim() !== '' &&
    !emailError &&
    !phoneError &&
    !abnError &&
    !bsbError &&
    !accountNumberError;

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      address: '',
      phoneNumber: '',
      email: '',
      abn: '',
      accountName: '',
      bsb: '',
      accountNumber: '',
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`carer-logos/${fileName}`, file);

      if (error) {
        console.error('Logo upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`carer-logos/${fileName}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      return null;
    }
  };

  const handleAdd = async () => {
    if (!isFormValid) return;

    let logoUrl: string | null = null;
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile);
    }

    const carerData = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      address: form.address.trim(),
      phone_number: form.phoneNumber.trim(),
      email: form.email.trim(),
      abn: form.abn.trim(),
      account_name: form.accountName.trim(),
      bsb: form.bsb.trim(),
      account_number: form.accountNumber.trim(),
      logo_url: logoUrl,
    };

    const { data, error } = await supabase
      .from('carers')
      .insert([carerData])
      .select();

    if (error) {
      console.error('Insert error:', error);
      alert('Failed to add carer: ' + error.message);
      return;
    }

    if (data && data[0]) {
      setCarers(prev => [...prev, data[0]]);
    }
    
    setFormVisible(false);
    resetForm();
  };

  const handleEdit = (carer: Carer) => {
    setForm({
      firstName: carer.first_name,
      lastName: carer.last_name,
      address: carer.address,
      phoneNumber: carer.phone_number,
      email: carer.email,
      abn: carer.abn,
      accountName: carer.account_name,
      bsb: carer.bsb,
      accountNumber: carer.account_number,
    });
    setEditingId(carer.id);
    setLogoPreview(carer.logo_url);
    setFormVisible(true);
  };

  const handleUpdate = async () => {
    if (!isFormValid || !editingId) return;

    let logoUrl: string | null = logoPreview;
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile);
    }

    const updateData = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      address: form.address.trim(),
      phone_number: form.phoneNumber.trim(),
      email: form.email.trim(),
      abn: form.abn.trim(),
      account_name: form.accountName.trim(),
      bsb: form.bsb.trim(),
      account_number: form.accountNumber.trim(),
      logo_url: logoUrl,
    };

    const { data, error } = await supabase
      .from('carers')
      .update(updateData)
      .eq('id', editingId)
      .select();

    if (error) {
      console.error('Update error:', error);
      alert('Failed to update carer: ' + error.message);
      return;
    }

    if (data && data[0]) {
      setCarers(prev => prev.map(carer => carer.id === editingId ? data[0] : carer));
    }
    
    setFormVisible(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this carer?')) return;

    const { error } = await supabase.from('carers').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + error.message);
      return;
    }

    setCarers(prev => prev.filter(carer => carer.id !== id));
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

    const draggedIndex = carers.findIndex((carer) => carer.id === draggedId);
    const targetIndex = carers.findIndex((carer) => carer.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCarers = [...carers];
    [newCarers[draggedIndex], newCarers[targetIndex]] = [
      newCarers[targetIndex],
      newCarers[draggedIndex],
    ];
    setCarers(newCarers);
    setDraggedId(null);
  };

  const formatBankDetails = (carer: Carer) => {
    return (
      <div style={{ fontSize: '0.85em', lineHeight: '1.2' }}>
        <div><strong>Account:</strong> {carer.account_name}</div>
        <div><strong>BSB:</strong> {carer.bsb}</div>
        <div><strong>Acc #:</strong> {carer.account_number}</div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Carers</h1>
      <button
        onClick={() => {
          setFormVisible(true);
          setEditingId(null);
          resetForm();
        }}
        style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}
      >
        Add Carer
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
          </div>

          {/* Address */}
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

          {/* Contact Information */}
          <label htmlFor="phoneNumber" className="label">
            Phone Number
          </label>
          <div className="control">
            <input
              id="phoneNumber"
              type="tel"
              placeholder="e.g. +61 400 000 000"
              value={form.phoneNumber}
              onChange={(e) => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
            />
            {phoneError && <div className="field-error">{phoneError}</div>}
          </div>

          <label htmlFor="email" className="label">
            Email
          </label>
          <div className="control">
            <input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            />
            {emailError && <div className="field-error">{emailError}</div>}
          </div>

          <label htmlFor="abn" className="label">
            ABN
          </label>
          <div className="control">
            <input
              id="abn"
              type="text"
              placeholder="Enter ABN (numbers and spaces only)"
              value={form.abn}
              onChange={(e) => setForm(prev => ({ ...prev, abn: e.target.value }))}
            />
            {abnError && <div className="field-error">{abnError}</div>}
          </div>

          {/* Logo Upload */}
          <label htmlFor="logo" className="label">
            Logo (Optional)
          </label>
          <div className="control">
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
            />
            {logoPreview && (
              <div style={{ marginTop: '0.5rem' }}>
                <img src={logoPreview} alt="Logo preview" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
              </div>
            )}
          </div>

          {/* Bank Details Section Header - spans both columns */}
          <div style={{ 
            gridColumn: '1 / -1', 
            marginTop: '20px',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border)',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'var(--text)'
          }}>
            Bank Details
          </div>

          <label htmlFor="accountName" className="label">
            Account Name
          </label>
          <div className="control">
            <input
              id="accountName"
              type="text"
              placeholder="Enter account holder name"
              value={form.accountName}
              onChange={(e) => setForm(prev => ({ ...prev, accountName: e.target.value }))}
            />
          </div>

          <label htmlFor="bsb" className="label">
            BSB
          </label>
          <div className="control">
            <input
              id="bsb"
              type="text"
              placeholder="Enter 6-digit BSB"
              value={form.bsb}
              maxLength={6}
              onChange={(e) => setForm(prev => ({ ...prev, bsb: e.target.value }))}
            />
            {bsbError && <div className="field-error">{bsbError}</div>}
          </div>

          <label htmlFor="accountNumber" className="label">
            Account Number
          </label>
          <div className="control">
            <input
              id="accountNumber"
              type="text"
              placeholder="Enter account number"
              value={form.accountNumber}
              onChange={(e) => setForm(prev => ({ ...prev, accountNumber: e.target.value }))}
            />
            {accountNumberError && <div className="field-error">{accountNumberError}</div>}
          </div>

          {/* Action Buttons */}
          <div></div>
          <div className="actions">
            <button
              disabled={!isFormValid}
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

      {/* Carers Table */}
      {carers.length > 0 && (
        <div className="carers-table" style={{ marginTop: '2rem' }}>
          {/* Header */}
          <div className="carers-header">
            <div>Seq</div>
            <div>Name</div>
            <div>Address</div>
            <div>Phone</div>
            <div>Email</div>
            <div>ABN</div>
            <div>Bank Details</div>
            <div>Logo</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {carers.map((carer, index) => (
            <div
              key={carer.id}
              className="carers-row row"
              draggable
              onDragStart={() => handleDragStart(carer.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(carer.id)}
              style={{
                backgroundColor: draggedId === carer.id ? 'var(--surface-accent)' : undefined,
              }}
            >
              <div>{index + 1}</div>
              <div>{`${carer.first_name} ${carer.last_name}`}</div>
              <div style={{ fontSize: '0.9em' }}>{carer.address}</div>
              <div>{carer.phone_number}</div>
              <div style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>{carer.email}</div>
              <div>{carer.abn}</div>
              <div style={{ fontSize: '0.85em', lineHeight: '1.2' }}>
                <div><strong>Account:</strong> {carer.account_name}</div>
                <div><strong>BSB:</strong> {carer.bsb}</div>
                <div><strong>Acc #:</strong> {carer.account_number}</div>
              </div>
              <div>
                {carer.logo_url ? (
                  <img 
                    src={carer.logo_url} 
                    alt="Logo" 
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }}
                  />
                ) : (
                  '—'
                )}
              </div>
              <div>
                <button
                  className="edit-btn"
                  title="Edit"
                  onClick={() => handleEdit(carer)}
                >
                  ✏️
                </button>
                <button
                  className="trash"
                  title="Delete"
                  onClick={() => handleDelete(carer.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .carers-table {
          display: grid;
          gap: 1px;
          background-color: var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .carers-header,
        .carers-row {
          display: grid;
          grid-template-columns: 50px minmax(150px, 1fr) minmax(200px, 2fr) minmax(120px, 1fr) minmax(180px, 1.5fr) minmax(100px, 1fr) minmax(150px, 1.2fr) 60px 100px;
          gap: 1px;
          background-color: var(--surface);
        }
        
        .carers-header {
          font-weight: 600;
          background-color: var(--surface-accent);
        }
        
        .carers-header > div,
        .carers-row > div {
          padding: 12px 8px;
          display: flex;
          align-items: center;
          background-color: inherit;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        
        .carers-row {
          cursor: grab;
        }
        
        .carers-row:hover {
          background-color: var(--surface-hover);
        }
        
        .carers-row:active {
          cursor: grabbing;
        }
        
        .carers-row > div:last-child {
          justify-content: center;
          align-self: center;
        }
        
        @media (max-width: 1400px) {
          .carers-header,
          .carers-row {
            grid-template-columns: 40px minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(100px, 1fr) minmax(150px, 1.2fr) minmax(80px, 0.8fr) minmax(120px, 1fr) 50px 80px;
            font-size: 0.9em;
          }
        }
        
        @media (max-width: 1200px) {
          .carers-header,
          .carers-row {
            grid-template-columns: 35px minmax(100px, 1fr) minmax(120px, 1.2fr) minmax(90px, 1fr) minmax(130px, 1fr) minmax(70px, 0.7fr) minmax(100px, 1fr) 45px 70px;
            font-size: 0.85em;
          }
        }
        
        @media (max-width: 900px) {
          .carers-header,
          .carers-row {
            grid-template-columns: 30px 1fr 1.2fr 0.8fr 1fr 0.6fr 1fr 40px 60px;
            font-size: 0.8em;
          }
        }
        `}</style>
    </div>
  );
}