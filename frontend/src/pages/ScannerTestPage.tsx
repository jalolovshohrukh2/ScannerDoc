import { useState } from 'react';
import { DocumentScanner } from '../components/DocumentScanner';
import type { DocType, ScannerResult } from '../components/DocumentScanner';

export function ScannerTestPage() {
  const [docType, setDocType] = useState<DocType>('passport');
  const [result, setResult] = useState<ScannerResult | null>(null);

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Scanner test page</h2>
        <p className="subtle">
          Standalone test page for the reusable <code>&lt;DocumentScanner /&gt;</code>. Pick a document type,
          capture or upload, then confirm. The returned <code>ScannerResult</code> is shown below.
        </p>
        <div className="row" style={{ marginBottom: 16 }}>
          <label style={{ marginBottom: 0, alignSelf: 'center' }}>Document type:</label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value as DocType);
              setResult(null);
            }}
            style={{ maxWidth: 200 }}
          >
            <option value="passport">Passport (TD3)</option>
            <option value="national_id">National ID (TD1)</option>
          </select>
        </div>
        <DocumentScanner
          key={docType}
          docType={docType}
          onComplete={(r) => {
            setResult(r);
            console.log('[ScannerTestPage] ScannerResult:', r);
          }}
        />
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Returned ScannerResult</h3>
          <pre className="json">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
