import { useEffect, useRef } from 'react';
// @ts-ignore
// import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import styles from './BarcodeScannerModal.module.css';

interface BarcodeScannerModalProps {
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function BarcodeScannerModal({ onClose, onScan }: BarcodeScannerModalProps) {
  // const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // useEffect(() => {
  //   // Initializing scanner safely
  //   const scanner = new Html5QrcodeScanner(
  //     "reader",
  //     { fps: 10, qrbox: { width: 250, height: 250 } },
  //     false
  //   );
  //   scannerRef.current = scanner;

  //   scanner.render(
  //     (decodedText: string) => {
  //       // Stop scanning after a successful read to avoid spamming
  //       if (scannerRef.current) {
  //         scannerRef.current.clear().then(() => {
  //           onScan(decodedText);
  //         }).catch(console.error);
  //       } else {
  //           onScan(decodedText);
  //       }
  //     },
  //     (_error: Error | string) => {
  //       // Ignoring background noise errors
  //     }
  //   );

  //   return () => {
  //     if (scannerRef.current) {
  //       scannerRef.current.clear().catch(console.error);
  //     }
  //   };
  // }, [onScan]);

  // return (
  //   <div className={styles.overlay} onClick={onClose}>
  //     <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
  //       <div className={styles.header}>
  //         <h2><Camera size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/> Scan Barcode</h2>
  //         <button onClick={onClose} className={styles.closeBtn}>
  //           <X size={20} />
  //         </button>
  //       </div>

  //       <div className={styles.content}>
  //         <div id="reader" className={styles.readerArea}></div>
  //         <p className={styles.instructions}>
  //           Point your camera at a product's barcode to instantly add it to the cart.
  //         </p>
  //       </div>
  //     </div>
  //   </div>
  // );
}
