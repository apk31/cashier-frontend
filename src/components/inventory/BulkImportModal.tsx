import { useState, useRef } from 'react';
import { X, UploadCloud, AlertCircle, FileText, Download } from 'lucide-react';
import styles from './BulkImportModal.module.css';
import { productsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import type { BulkProductRow } from '../../types';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    // Simple naive CSV preview parser
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        setError('File must contain a header row and data.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = headers.reduce((o: any, header, i) => {
          o[header] = values[i]?.trim() || '';
          return o;
        }, {});

        // Type conversion for BulkProductRow
        return {
          category_name: obj.category_name,
          product_name: obj.product_name,
          variant_name: obj.variant_name || '',
          sku: obj.sku,
          barcode: obj.barcode || '',
          price: Number(obj.price) || 0,
          base_price: Number(obj.base_price) || 0, // <-- ADD THIS LINE
          stock: Number(obj.stock) || 0,
          has_open_price: obj.has_open_price?.toLowerCase() === 'true'
        } as BulkProductRow;
      });

      setPreview(parsedData);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) return;
    setIsUploading(true);

    try {
      const res = await productsApi.bulkApply(preview);
      toast.success(`Berhasil memproses! Created: ${res.created}, Updated: ${res.updated}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to sync with server. Please try again or check your CSV format.');
      } else {
        setError('Unknown error occurred');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      "category_name,product_name,variant_name,sku,barcode,price,base_price,stock,has_open_price",
      "Coffee,Espresso,Regular,ESP-101,,20000,8000,100,false",
      "Coffee,Seasonal Beans,100g,BEANS-100,,0,15000,20,true",
      "Pastry,Butter Croissant,,CRS-BUT,,25000,12000,50,false"
    ].join("\n");

    const blob = new Blob([templateRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_bulk_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Import Products via CSV</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!file ? (
            <div className={styles.uploadStateContainer}>
              <div
                className={styles.dropzone}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className={styles.hiddenInput}
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <UploadCloud size={48} className={styles.dropIcon} />
                <h3>Click or drag CSV file to upload</h3>
                <p>Format must exactly match the standard template columns</p>
              </div>

              <button
                className={styles.templateBtn}
                onClick={handleDownloadTemplate}
                title="Download CSV reference template"
              >
                <Download size={16} /> Download CSV Template
              </button>
            </div>
          ) : (
            <div className={styles.previewContainer}>
              <div className={styles.fileCard}>
                <FileText size={24} className={styles.fileIcon} />
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <button className={styles.removeFileBtn} onClick={() => setFile(null)}>
                  Remove
                </button>
              </div>

              {preview.length > 0 && (
                <div className={styles.dataPreview}>
                  <h4>Previewing top 3 rows</h4>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          {Object.keys(preview[0]).map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 3).map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((v: any, i) => <td key={i}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            className={styles.uploadBtn}
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? 'Processing...' : 'Upload & Sync Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
