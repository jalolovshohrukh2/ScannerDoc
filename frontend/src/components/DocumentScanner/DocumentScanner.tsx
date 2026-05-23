import { useState } from 'react';
import { CaptureStep } from './CaptureStep';
import { ReviewStep } from './ReviewStep';
import type { DocType, ScannedDocument, ScannerResult } from './types';
import { scanDocument } from '../../api/client';

export interface DocumentScannerProps {
  docType: DocType;
  onComplete: (result: ScannerResult) => void;
  onCancel?: () => void;
}

export function DocumentScanner({ docType, onComplete, onCancel }: DocumentScannerProps) {
  const [front, setFront] = useState<Blob | null>(null);
  const [back, setBack] = useState<Blob | null>(null);
  const [scan, setScan] = useState<ScannedDocument | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    if (!front) return;
    if (docType === 'national_id' && !back) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scanDocument({ front, back: docType === 'national_id' ? back : null, docType });
      setScan(result);
    } catch (err: any) {
      setError(err?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function goBack() {
    setScan(null);
  }

  if (scan) {
    return <ReviewStep scan={scan} onConfirm={onComplete} onBack={goBack} />;
  }

  return (
    <div>
      <CaptureStep
        docType={docType}
        front={front}
        back={back}
        onFrontChange={setFront}
        onBackChange={setBack}
        onScan={runScan}
        scanning={scanning}
        error={error}
      />
      {onCancel && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}
