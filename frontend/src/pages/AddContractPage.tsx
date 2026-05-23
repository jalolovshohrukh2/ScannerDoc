import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentScanner } from '../components/DocumentScanner';
import type { DocType, ScannerResult } from '../components/DocumentScanner';
import {
  createContract,
  listClients,
  listContracts,
  type ClientRow,
  type ContractRow,
} from '../api/client';

type ClientSource = 'existing' | 'scan';

interface ContractForm {
  title: string;
  amount: string;
  currency: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: ContractForm = {
  title: '',
  amount: '',
  currency: 'TJS',
  start_date: '',
  end_date: '',
  notes: '',
};

export function AddContractPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState<ClientSource>('scan');
  const [docType, setDocType] = useState<DocType>('passport');
  const [scan, setScan] = useState<ScannerResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pickedClientId, setPickedClientId] = useState<number | ''>('');
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
    listContracts().then(setContracts).catch(() => {});
  }, []);

  const pickedClient = clients.find((c) => c.id === pickedClientId);

  const haveClientInfo =
    source === 'scan'
      ? !!scan
      : !!pickedClient;

  async function onSave() {
    if (!form.title) {
      setError('Title is required');
      return;
    }
    if (!haveClientInfo) {
      setError('Pick an existing client or scan a document.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base: Record<string, unknown> = {
        title: form.title,
        amount: form.amount,
        currency: form.currency,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes,
      };
      let payload: Record<string, unknown>;
      if (source === 'scan' && scan) {
        payload = {
          ...base,
          client_doc_type: scan.docType,
          client_surname: scan.fields.surname,
          client_given_names: scan.fields.givenNames,
          client_document_number: scan.fields.documentNumber,
          client_nationality: scan.fields.nationality,
          client_date_of_birth: scan.fields.dateOfBirth,
          client_sex: scan.fields.sex,
          client_expiry_date: scan.fields.expiryDate,
          client_patronymic: scan.manual.patronymic,
          client_patronymic_cyr: scan.manual.patronymicCyr,
          client_surname_cyr: scan.manual.surnameCyr,
          client_given_names_cyr: scan.manual.givenNamesCyr,
          client_issuing_authority: scan.manual.issuingAuthority,
          client_issuing_authority_cyr: scan.manual.issuingAuthorityCyr,
          client_address: scan.manual.address,
          client_phone: scan.manual.phone,
          client_email: scan.manual.email,
          front_image_url: scan.images.frontUrl,
          back_image_url: scan.images.backUrl || '',
        };
      } else if (pickedClient) {
        payload = {
          ...base,
          client_id: pickedClient.id,
          client_doc_type: pickedClient.doc_type,
          client_surname: pickedClient.surname,
          client_given_names: pickedClient.given_names,
          client_document_number: pickedClient.document_number,
          client_nationality: pickedClient.nationality,
          client_date_of_birth: pickedClient.date_of_birth,
        };
      } else {
        throw new Error('No client info');
      }
      const saved = await createContract(payload);
      navigate(`/contracts?saved=${saved.id}`);
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add Contract</h2>

        <div className="field-group">
          <h3>Client</h3>
          <div className="row" style={{ marginBottom: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input
                type="radio"
                checked={source === 'scan'}
                onChange={() => {
                  setSource('scan');
                  setPickedClientId('');
                }}
              />
              Scan document now
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input
                type="radio"
                checked={source === 'existing'}
                onChange={() => {
                  setSource('existing');
                  setScan(null);
                  setShowScanner(false);
                }}
              />
              Pick existing client
            </label>
          </div>

          {source === 'existing' && (
            <div>
              <label>Client</label>
              <select
                value={pickedClientId}
                onChange={(e) =>
                  setPickedClientId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
              >
                <option value="">— select —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.surname} {c.given_names} ({c.document_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          {source === 'scan' && (
            <div>
              {!scan && !showScanner && (
                <div className="row">
                  <label style={{ marginBottom: 0, alignSelf: 'center' }}>Document type:</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="passport">Passport (TD3)</option>
                    <option value="national_id">National ID (TD1)</option>
                  </select>
                  <button className="btn btn-primary" onClick={() => setShowScanner(true)}>
                    Start scan
                  </button>
                </div>
              )}
              {showScanner && !scan && (
                <DocumentScanner
                  key={docType}
                  docType={docType}
                  onComplete={(r) => {
                    setScan(r);
                    setShowScanner(false);
                  }}
                  onCancel={() => setShowScanner(false)}
                />
              )}
              {scan && (
                <div className="grid-2">
                  <Display label="Name" value={`${scan.fields.surname} ${scan.fields.givenNames}`.trim()} />
                  <Display label="Document #" value={scan.fields.documentNumber} />
                  <Display label="Nationality" value={scan.fields.nationality} />
                  <Display label="DOB" value={scan.fields.dateOfBirth} />
                  <Display label="Patronymic" value={scan.manual.patronymic} />
                  <Display label="Phone" value={scan.manual.phone} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button className="btn" onClick={() => { setScan(null); }}>
                      Re-scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="field-group">
          <h3>Contract</h3>
          <div className="grid-2">
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label>Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="TJS">TJS</option>
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label>Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label>End date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onSave} disabled={saving || !haveClientInfo}>
            {saving ? 'Saving…' : 'Save contract'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent contracts</h3>
        {contracts.length === 0 ? (
          <p className="subtle">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.title}</td>
                  <td>
                    {c.client_surname} {c.client_given_names}
                    {c.client_document_number ? ` (${c.client_document_number})` : ''}
                  </td>
                  <td>
                    {c.amount} {c.currency}
                  </td>
                  <td>{c.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
