import { useEffect, useRef, useState } from 'react';
import type { DocType } from './types';

interface CaptureTileProps {
  label: string;
  blob: Blob | null;
  onChange: (blob: Blob | null) => void;
}

function CaptureTile({ label, blob, onChange }: CaptureTileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const previewUrl = blob ? URL.createObjectURL(blob) : null;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Always stop the stream on unmount.
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach the stream after the <video> element actually exists in the DOM.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const onMeta = () => {
      video.play().catch((e) => setCameraError(e?.message || 'play() blocked'));
    };
    video.addEventListener('loadedmetadata', onMeta);
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [stream]);

  async function refreshDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'videoinput'));
    } catch {
      /* ignore */
    }
  }

  async function startCamera(forceDeviceId?: string | null) {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not expose getUserMedia (need https:// or localhost).');
      return;
    }
    // Stop any existing stream first.
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);

    const targetId = forceDeviceId ?? deviceId;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: targetId
        ? { deviceId: { exact: targetId }, width: { ideal: 1920 } }
        : { width: { ideal: 1920 } },
    };
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      // Now that permission is granted, device labels are readable.
      await refreshDevices();
      const used = s.getVideoTracks()[0]?.getSettings().deviceId;
      if (used) setDeviceId(used);
    } catch (err: any) {
      const name = err?.name || '';
      let msg = err?.message || 'Could not access camera';
      if (name === 'NotAllowedError') msg = 'Camera permission denied. Allow it for this site in the browser address-bar.';
      else if (name === 'NotFoundError') msg = 'No camera device found.';
      else if (name === 'NotReadableError') msg = 'Camera is in use by another app (Zoom/Teams/Skype/etc.). Close it and retry.';
      else if (name === 'OverconstrainedError') msg = 'Selected camera does not meet the requested constraints.';
      setCameraError(msg);
    }
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  async function switchDevice(id: string) {
    setDeviceId(id);
    await startCamera(id);
  }

  async function snap() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setCameraError('Camera not producing frames yet — wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const snapBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    );
    if (snapBlob) onChange(snapBlob);
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onChange(file);
    e.target.value = '';
  }

  return (
    <div className="capture-tile">
      <h4>{label}</h4>
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={label} className="preview-img" />
          <div className="row">
            <button className="btn" onClick={() => onChange(null)}>Retake</button>
          </div>
        </>
      ) : stream ? (
        <>
          <video ref={videoRef} playsInline muted autoPlay />
          {cameraError && <div className="error-box">{cameraError}</div>}
          {devices.length > 1 && (
            <div>
              <label>Camera</label>
              <select
                value={deviceId ?? ''}
                onChange={(e) => switchDevice(e.target.value)}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={snap}>Capture</button>
            <button className="btn" onClick={stopCamera}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          {cameraError && <div className="error-box">{cameraError}</div>}
          <div className="row">
            <button className="btn" onClick={() => startCamera()}>Use camera</button>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              Upload image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              style={{ display: 'none' }}
            />
          </div>
          <p className="subtle">Best results: the MRZ flat, well-lit, in focus, filling the frame.</p>
        </>
      )}
    </div>
  );
}

export interface CaptureStepProps {
  docType: DocType;
  front: Blob | null;
  back: Blob | null;
  onFrontChange: (b: Blob | null) => void;
  onBackChange: (b: Blob | null) => void;
  onScan: () => void;
  scanning: boolean;
  error: string | null;
}

export function CaptureStep(props: CaptureStepProps) {
  const { docType, front, back, onFrontChange, onBackChange, onScan, scanning, error } = props;
  const needsBack = docType === 'national_id';
  const canScan = !!front && (!needsBack || !!back) && !scanning;

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="row">
        <CaptureTile
          label={docType === 'passport' ? 'Passport data page' : 'National ID — front'}
          blob={front}
          onChange={onFrontChange}
        />
        {needsBack && (
          <CaptureTile
            label="National ID — back (MRZ)"
            blob={back}
            onChange={onBackChange}
          />
        )}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={onScan} disabled={!canScan}>
          {scanning ? 'Scanning…' : 'Scan document'}
        </button>
        {scanning && <span className="subtle">OCR + MRZ parse can take a few seconds…</span>}
      </div>
    </div>
  );
}
