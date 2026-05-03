import React, { useState, useEffect } from 'react';
import { IoCloseOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline, IoHelpCircleOutline } from 'react-icons/io5';
import Button from './Button';
import Input from './Input';

/**
 * ConfirmModal Component
 * A premium replacement for window.confirm and window.prompt
 */
export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmation", 
  message = "Êtes-vous sûr de vouloir continuer ?",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  type = "warning", // 'warning', 'info', 'success', 'prompt'
  initialValue = "",
  placeholder = "Saisissez votre réponse...",
  loading = false
}) {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setInputValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <IoCheckmarkCircleOutline size={40} color="#10B981" />;
      case 'info':    return <IoHelpCircleOutline size={40} color="var(--primary)" />;
      case 'prompt':  return <IoHelpCircleOutline size={40} color="var(--primary)" />;
      default:        return <IoAlertCircleOutline size={40} color="#F59E0B" />;
    }
  };

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            transition: 'all 0.2s'
          }}
        >
          <IoCloseOutline size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            {getIcon()}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {title}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {type === 'prompt' && (
          <div style={{ marginBottom: '24px' }}>
            <Input 
              autoFocus
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            variant="outline" 
            onClick={onClose} 
            style={{ flex: 1, borderRadius: '12px' }}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={type === 'warning' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            style={{ flex: 1, borderRadius: '12px' }}
          >
            {confirmText}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
