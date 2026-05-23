import { useEffect, useState } from 'react';
import type { ScannedDocument, ScannerResult, ManualFields, Sex } from './types';
import { EMPTY_MANUAL } from './types';
import { withUploadToken } from '../../api/client';

interface ReviewStepProps {
  scan: ScannedDocument;
  onConfirm: (result: ScannerResult) => void;
  onBack: () => void;
}

export function ReviewStep({ scan, onConfirm, onBack }: ReviewStepProps) {
  const [fields, setFields] = useState(scan.fields);
  const [manual, setManual] = useState<ManualFields>(() => ({
    ...EMPTY_MANUAL,
    patronymic: scan.suggestedManual?.patronymic || '',
    patronymicCyr: scan.suggestedManual?.patronymicCyr || '',
    surnameCyr: scan.suggestedManual?.surnameCyr || '',
    givenNamesCyr: scan.suggestedManual?.givenNamesCyr || '',
    issuingAuthority: scan.suggestedManual?.issuingAuthority || '',
    issuingAuthorityCyr: scan.suggestedManual?.issuingAuthorityCyr || '',
    address: scan.suggestedManual?.address || '',
  }));
  const [frontSrc, setFrontSrc] = useState<string | null>(null);
  const [backSrc, setBackSrc] = useState<string | null>(null);

  const anyAutoFilled =
    !!scan.suggestedManual &&
    Object.values(scan.suggestedManual).some((v) => v && v.length > 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const f = scan.images.frontUrl ? await withUploadToken(scan.images.frontUrl) : null;
      const b = scan.images.backUrl ? await withUploadToken(scan.images.backUrl) : null;
      if (!cancelled) {
        setFrontSrc(f);
        setBackSrc(b);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scan.images.frontUrl, scan.images.backUrl]);

  function update<K extends keyof typeof fields>(k: K, v: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }
  function updateManual<K extends keyof ManualFields>(k: K, v: ManualFields[K]) {
    setManual((prev) => ({ ...prev, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm({
      docType: scan.docType,
      fields,
      manual,
      warnings: scan.warnings,
      images: scan.images,
      rawMrz: scan.rawMrz,
      visualText: scan.visualText,
      ocrEngine: scan.ocrEngine,
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="row" style={{ marginBottom: 16 }}>
        {frontSrc && (
          <div style={{ flex: '1 1 220px' }}>
            <label>Front</label>
            <img src={frontSrc} alt="Front" className="preview-img" />
          </div>
        )}
        {backSrc && (
          <div style={{ flex: '1 1 220px' }}>
            <label>Back (MRZ)</label>
            <img src={backSrc} alt="Back" className="preview-img" />
          </div>
        )}
      </div>

      {scan.warnings.length > 0 && (
        <div className="warning-box">
          <strong>{scan.warnings.length} warning(s) — verify these fields:</strong>
          <ul>
            {scan.warnings.map((w, i) => (
              <li key={i}>
                <code>{w.field}</code>: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="field-group">
        <h3>From document (editable)</h3>
        <div className="grid-2">
          <div>
            <label>Surname</label>
            <input
              type="text"
              value={fields.surname}
              onChange={(e) => update('surname', e.target.value)}
            />
          </div>
          <div>
            <label>Given names</label>
            <input
              type="text"
              value={fields.givenNames}
              onChange={(e) => update('givenNames', e.target.value)}
            />
          </div>
          <div>
            <label>Document number</label>
            <input
              type="text"
              value={fields.documentNumber}
              onChange={(e) => update('documentNumber', e.target.value)}
            />
          </div>
          <div>
            <label>Nationality</label>
            <input
              type="text"
              value={fields.nationality}
              onChange={(e) => update('nationality', e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label>Date of birth</label>
            <input
              type="date"
              value={fields.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <label>Sex</label>
            <select value={fields.sex} onChange={(e) => update('sex', e.target.value as Sex)}>
              <option value="">—</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="X">X</option>
            </select>
          </div>
          <div>
            <label>Expiry date</label>
            <input
              type="date"
              value={fields.expiryDate}
              onChange={(e) => update('expiryDate', e.target.value)}
            />
          </div>
          <div>
            <label>Document type</label>
            <input type="text" value={scan.docType} readOnly />
          </div>
        </div>
      </div>

      {scan.visualText && scan.visualText.trim().length > 0 && (
        <div className="field-group">
          <h3>Document text — copy reference (OCR: {scan.ocrEngine})</h3>
          <p className="subtle" style={{ marginTop: 0 }}>
            Raw text read from the front of the document (Cyrillic + Latin). Select what you need
            and paste into the fields below.
          </p>
          <textarea
            readOnly
            value={scan.visualText}
            rows={Math.min(12, Math.max(4, scan.visualText.split('\n').length))}
            style={{ fontFamily: 'Consolas, Menlo, monospace', whiteSpace: 'pre' }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => navigator.clipboard?.writeText(scan.visualText)}
            >
              Copy all
            </button>
          </div>
        </div>
      )}

      <div className="field-group">
        <h3>Manual entry (not in MRZ)</h3>
        {anyAutoFilled && (
          <p className="subtle" style={{ marginTop: 0 }}>
            Some fields below were auto-filled from the visual side of the document. Verify and edit
            before saving.
          </p>
        )}
        <div className="grid-2">
          <div>
            <label>Patronymic (Latin)</label>
            <input
              type="text"
              value={manual.patronymic}
              onChange={(e) => updateManual('patronymic', e.target.value)}
            />
          </div>
          <div>
            <label>Patronymic (Cyrillic)</label>
            <input
              type="text"
              value={manual.patronymicCyr}
              onChange={(e) => updateManual('patronymicCyr', e.target.value)}
            />
          </div>
          <div>
            <label>Surname (Cyrillic)</label>
            <input
              type="text"
              value={manual.surnameCyr}
              onChange={(e) => updateManual('surnameCyr', e.target.value)}
            />
          </div>
          <div>
            <label>Given names (Cyrillic)</label>
            <input
              type="text"
              value={manual.givenNamesCyr}
              onChange={(e) => updateManual('givenNamesCyr', e.target.value)}
            />
          </div>
          <div>
            <label>Issuing authority (Latin)</label>
            <input
              type="text"
              value={manual.issuingAuthority}
              onChange={(e) => updateManual('issuingAuthority', e.target.value)}
            />
          </div>
          <div>
            <label>Issuing authority (Cyrillic)</label>
            <input
              type="text"
              value={manual.issuingAuthorityCyr}
              onChange={(e) => updateManual('issuingAuthorityCyr', e.target.value)}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Address</label>
            <textarea
              rows={2}
              value={manual.address}
              onChange={(e) => updateManual('address', e.target.value)}
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              type="tel"
              value={manual.phone}
              onChange={(e) => updateManual('phone', e.target.value)}
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={manual.email}
              onChange={(e) => updateManual('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      {scan.rawMrz.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="subtle">Show raw MRZ</summary>
          <pre className="json" style={{ marginTop: 6 }}>
            {scan.rawMrz.join('\n')}
          </pre>
        </details>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary">Confirm</button>
      </div>
    </form>
  );
}
