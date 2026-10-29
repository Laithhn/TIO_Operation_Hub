import { useCallback, useRef, useState } from 'react';
import { ApiError, uploadWithProgress } from '../../api';
import { useRefresh } from '../../hooks';
import { Icon } from '../../ui/Icon';
import { Dialog, useToast } from '../../ui/kit';
import { categoryOf, checkFiles, fmtSize, type Limits } from './model';

/** Upload files: drop or browse, the same limits as the server (which checks again), progress while sending, then the list reloads. */
export function AttachmentUpload({ recordType, recordId, what, limits, onClose }: { recordType: string; recordId: number; what: string; limits?: Limits; onClose: () => void }) {
  const [picked, setPicked] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const refresh = useRefresh();
  const busy = progress !== null;
  // Not closed while sending; a stable callback, so the dialog does not move the focus on every progress update.
  const sending = useRef(false);
  sending.current = busy;
  const close = useCallback(() => { if (!sending.current) onClose(); }, [onClose]);
  const total = picked.reduce((n, f) => n + f.size, 0);

  const choose = (files: FileList | File[]) => {
    const list = Array.from(files);
    const problems = checkFiles(list, limits, picked.length);
    setError(problems);
    if (problems.length === 0) setPicked(p => [...p, ...list]);
  };
  const send = async () => {
    setProgress(0); setError([]);
    const form = new FormData();
    form.append('recordType', recordType);
    form.append('recordId', String(recordId));
    if (description.trim()) form.append('description', description.trim());
    picked.forEach(f => form.append('files', f, f.name));
    try {
      await uploadWithProgress('/attachments', form, setProgress);
      toast(`${picked.length} file(s) uploaded.`);
      await refresh();
      onClose();
    } catch (e) {
      const all = e instanceof ApiError ? Object.values(e.errors ?? {}).flat() : [];
      setError(all.length ? all : [e instanceof ApiError ? (e.detail ?? e.title) : (e as Error).message]);
      setProgress(null);
    }
  };

  return (
    <Dialog title="Upload files" onClose={close} wide>
      <div className={`att-drop${drag ? ' over' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) choose(e.dataTransfer.files); }}>
        <Icon name="IMPORT" size={28} />
        <div><b>Drag files here</b> or</div>
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>Browse files</button>
        <input ref={input} type="file" multiple hidden aria-label={`Choose files to attach to this ${what}`} accept={limits?.extensions.join(',')}
          onChange={e => { if (e.target.files) choose(e.target.files); e.target.value = ''; }} />
        {limits && <span className="hint">Up to {limits.maxFilesPerUpload} files, {limits.maxFileMB} MB each. Accepted: {limits.extensions.map(x => x.slice(1)).join(', ')}.</span>}
      </div>
      {error.length > 0 && <ul className="notice bad att-upload-err" role="alert">{error.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {picked.length > 0 && (
        <>
          <ul className="att-picked" aria-label="Files to upload">
            {picked.map((f, i) => (
              <li key={i}>
                <span className={`att-ficon cat-${categoryOf(f.name).key}`} aria-hidden="true"><Icon name={categoryOf(f.name).icon} size={16} /></span>
                <span className="att-picked-name" title={f.name}>{f.name}</span>
                <span className="muted nowrap">{fmtSize(f.size)}</span>
                <button type="button" className="btn btn-ghost att-icon-btn" disabled={busy} onClick={() => setPicked(p => p.filter((_, j) => j !== i))} aria-label={`Do not upload ${f.name}`}><Icon name="close" size={14} /></button>
              </li>
            ))}
          </ul>
          <label className="field att-desc"><span>Description (optional)</span>
            <input className="input" placeholder="e.g. Signed SLA annex" value={description} maxLength={500} disabled={busy} onChange={e => setDescription(e.target.value)} />
          </label>
        </>
      )}
      {busy && (
        <div className="att-progress" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
          <div className="hint">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : 'Checking and saving the files…'}</div>
        </div>
      )}
      <div className="form-actions">
        <span className="muted att-total">{picked.length > 0 && `${picked.length} file(s), ${fmtSize(total)}`}</span>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || picked.length === 0} onClick={send}>{busy ? 'Uploading…' : picked.length ? `Upload ${picked.length} file(s)` : 'Upload'}</button>
      </div>
    </Dialog>
  );
}
