import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { AlertCircle, RefreshCw, Trash2, CheckCircle2, X } from 'lucide-react';
import styles from './NotificationDropdown.module.css';

interface QueueItem {
  id: string;
  error?: string;
  synced_at?: string;
  // backend payload might have more but we only need basic details
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-fetch queue
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await apiFetch('/offline/queue');
      // If backend is active and returns array
      if (Array.isArray(data)) {
        setQueue(data);
      }
    } catch (err) {
      // Mute errors for polling, maybe log to console
    }
  };

  const handleRetry = async (id: string) => {
    setLoading(true);
    try {
      await apiFetch(`/offline/queue/${id}/retry`, { method: 'POST' });
      await fetchQueue();
    } catch (e: any) {
      alert('Retry failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async (id: string) => {
    if (!confirm('Are you sure you want to permanently discard this transaction?')) return;
    setLoading(true);
    try {
      await apiFetch(`/offline/queue/${id}`, { method: 'DELETE' });
      await fetchQueue();
    } catch (e: any) {
      alert('Discard failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title="Offline Sync Alerts"
      >
        <AlertCircle size={20} />
        {queue.length > 0 && <span className={styles.badge}>{queue.length}</span>}
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Danger Zone: Sync Conflicts ({queue.length})</h3>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                <X size={20} /> {/* Make sure to import { X } from 'lucide-react' at the top */}
              </button>
            </div>
            
            <div className={styles.list} style={{ maxHeight: '60vh', padding: '1rem' }}>
              {queue.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={32} className={styles.successIcon} />
                  <p>All offline data synced securely.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className={styles.item} style={{ borderRadius: '8px', marginBottom: '8px', padding: '1rem' }}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemId}>Transaction ID: {item.id}</span>
                      <p className={styles.errorMessage} style={{ whiteSpace: 'normal', marginTop: '4px', fontSize: '0.9rem' }}>
                        {item.error || 'Unknown Error'}
                      </p>
                    </div>
                    <div className={styles.actions} style={{ alignSelf: 'flex-start' }}>
                      <button 
                        onClick={() => handleRetry(item.id)}
                        disabled={loading}
                        title="Force Retry"
                        className={styles.actionBtn}
                      >
                        <RefreshCw size={16} /> <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>Retry</span>
                      </button>
                      <button 
                        onClick={() => handleDiscard(item.id)}
                        disabled={loading}
                        title="Discard"
                        className={`${styles.actionBtn} ${styles.dangerBtn}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
