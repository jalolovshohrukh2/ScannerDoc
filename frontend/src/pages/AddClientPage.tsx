import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentScanner } from '../components/DocumentScanner';
import type { DocType, ScannerResult } from '../components/DocumentScanner';
import { createClient, listClients, type ClientRow } from '../api/client';
import { useEffect } from 'react';

type Step = 'choose' | 'scan' | 'save';

export function AddClientPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [docType, setDocType] = useState<DocType>('passport');
  const [scan, setScan] = useState<ScannerResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  async function onSave() {
    if (!scan) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        doc_type: scan.docType,
        surname: scan.fields.surname,
        given_names: scan.fields.givenNames,
        document_number: scan.fields.documentNumber,
        nationality: scan.fields.nationality,
        date_of_birth: scan.fields.dateOfBirth,
        sex: scan.fields.sex,
        expiry_date: scan.fields.expiryDate,
        patronymic: scan.manual.patronymic,
        surname_cyr: scan.manual.surnameCyr,
        given_names_cyr: scan.manual.givenNamesCyr,
        issuing_authority: scan.manual.issuingAuthority,
        address: scan.manual.address,
        phone: scan.manual.phone,
        email: scan.manual.email,
        front_image_url: scan.images.frontUrl,
        back_image_url: scan.images.backUrl || '',
      };
      const saved = await createClient(payload);
      navigate(`/clients?saved=${saved.id}`);
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add Client</h2>
        <p className="subtle">Scan a passport or national ID, review, and save.</p>

        {step === 'choose' && (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <label style={{ marginBottom: 0, alignSelf: 'center' }}>Document type:</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                style={{ maxWidth: 220 }}
              >
                <option value="passport">Passport (TD3)</option>
                <option value="national_id">National ID (TD1)</option>
              </select>
              <button className="btn btn-primary" onClick={() => setStep('scan')}>
                Start scan
              </button>
            </div>
          </>
        )}

        {step === 'scan' && (
          <DocumentScanner
            key={docType}
            docType={docType}
            onComplete={(r) => {
              setScan(r);
              setStep('save');
            }}
            onCancel={() => setStep('choose')}
          />
        )}

        {step === 'save' && scan && (
          <div>
            {error && <div className="error-box">{error}</div>}
            <div className="field-group">
              <h3>Ready to save</h3>
              <div className="grid-2">
                <Display label="Surname" value={scan.fields.surname} />
                <Display label="Given names" value={scan.fields.givenNames} />
                <Display label="Patronymic" value={scan.manual.patronymic} />
                <Display label="Document #" value={scan.fields.documentNumber} />
                <Display label="Nationality" value={scan.fields.nationality} />
                <Display label="Date of birth" value={scan.fields.dateOfBirth} />
                <Display label="Sex" value={scan.fields.sex} />
                <Display label="Expiry" value={scan.fields.expiryDate} />
                <Display label="Issuing authority" value={scan.manual.issuingAuthority} />
                <Display label="Phone" value={scan.manual.phone} />
                <Display label="Email" value={scan.manual.email} />
                <Display label="Address" value={scan.manual.address} />
                <Display label="Surname (Cyr)" value={scan.manual.surnameCyr} />
                <Display label="Given names (Cyr)" value={scan.manual.givenNamesCyr} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setStep('scan')}>Back to review</button>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save client'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent clients</h3>
        {clients.length === 0 ? (
          <p className="subtle">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Doc #</th>
                <th>Nationality</th>
                <th>DOB</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>
                    {c.surname} {c.given_names}
                  </td>
                  <td>{c.document_number}</td>
                  <td>{c.nationality}</td>
                  <td>{c.date_of_birth}</td>
                  <td>{c.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ marginTop: 12 }}>
          <Link to="/contracts/new">Create a contract for one of these →</Link>
        </p>
      </div>
    </div>
  );
}

function Display({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label>{label}</label>
      <div style={{ padding: '8px 10px', background: '#f6f8fa', borderRadius: 6, minHeight: 36 }}>
        {value || <span className="subtle">—</span>}
      </div>
    </div>
  );
}
