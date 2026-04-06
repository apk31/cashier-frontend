import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2 } from 'lucide-react';
import styles from './CategoryModal.module.css';
import { categoriesApi } from '../../lib/api';
import toast from 'react-hot-toast';
import type { Category } from '../../types';

interface CategoryModalProps {
  onClose: () => void;
  categories: Category[];
}

export default function CategoryModal({ onClose, categories }: CategoryModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
      setName('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to create category';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to delete category';
      toast.error(msg);
    }
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Categories</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label>New Category Name</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className={styles.input} 
                placeholder="e.g. Beverages"
              />
              <button 
                className={styles.saveBtn} 
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
              >
                <Save size={18} style={{marginRight: 4}}/> Add
              </button>
            </div>
          </div>

          <hr className={styles.divider} />

          <h3 style={{fontSize: '0.95rem', marginBottom: '0.5rem', marginTop: 0}}>Existing Categories</h3>
          <div className={styles.list}>
            {categories.length === 0 ? (
              <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>No categories found. Add one above.</p>
            ) : (
              categories.map(c => (
                <div key={c.id} className={styles.listItem}>
                  <span>{c.name}</span>
                  <button 
                    className={styles.iconBtnDanger}
                    onClick={() => {
                        if (window.confirm(`Delete category ${c.name}? This might fail if products are attached.`)) {
                            deleteMutation.mutate(c.id);
                        }
                    }}
                    disabled={deleteMutation.isPending}
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
