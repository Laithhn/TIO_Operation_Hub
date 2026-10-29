import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ApiError, del, get, qs, upload } from '../api';
import { fmtDateTime } from '../format';
import { useCan, useMe, useRefresh } from '../hooks';
import { Icon } from '../ui/Icon';
import { Panel, StateMessage, useToast } from '../ui/kit';
import { checkFiles, fmtSize, type Attachment, type Limits } from './attachmentView';

/** A46: files attached to a record. The files are kept on the server's disk (configured folder); only their details are in the database. */

export function AttachmentsPanel({ recordType, recordId, canEdit, title = 'Attachments' }: { recordType: string; recordId: number; canEdit: boolean; title?: string }) {
  const me = useMe().data!;
  const canDeleteAny = useCan('Delete');
  const q = useQuery({ queryKey: ['attachments', recordType, recordId], queryFn: () => get<Attachment[]>(`/attachments${qs({ recordType, recordId })}`) });
  const limits = useQuery({ queryKey: ['attachment-limits'], queryFn: () => get<Limits>('/attachments/limits'), staleTime: 10 * 60_000 });
  const [picked, setPicked] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const refresh = useRefresh();
  const l = limits.data;

  // Checked here for a quick answer; the server checks again.
  const choose = (files: FileList | File[]) => {
    const list = Array.from(files);
    const problems = checkFiles(list, l, picked.length);
    setError(problems);
    if (problems.length === 0) setPicked(p => [...p, ...list]);
  };
  const send = async () => {
    setBusy(true); setError([]);
    const form = new FormData();
    form.append('recordType', recordType);
    form.append('recordId', String(recordId));
    if (description.trim()) form.append('description', description.trim());
    picked.forEach(f => form.append('files', f, f.name));
    try {
      await upload('/attachments', form);
      toast(`${picked.length} file(s) attached.`);
      setPicked([]); setDescription('');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors ?? {}).flat().length ? Object.values(e.errors ?? {}).flat() : [e.detail ?? e.title]) : [(e as Error).message]);
    } finally { setBusy(false); }
  };
  const remove = async (a: Attachment) => {
    if (!window.confirm(`Remove ${a.fileName}? The file is deleted from the server.`)) return;
    try { await del(`/attachments/${a.id}`); toast(`${a.fileName} removed.`); await refresh(); }
    catch (e) { toast(e instanceof ApiError ? (e.detail ?? e.title) : (e as Error).message); }
  };
  const files = q.data ?? [];
  return (
    <Panel title={`${title}${files.length ? ` (${files.length})` : ''}`} pad={false}>
      {canEdit && (
        <div className="attach-drop-wrap">
          <div className={`attach-drop${drag ? ' over' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files); }}>
            <Icon name="download" size={18} />
            <span>Drag files here or <button type="button" className="linkbtn" onClick={() => input.current?.click()}>choose files</button></span>
            <input ref={input} type="file" multiple hidden aria-label={`Choose files to attach to this ${recordType.toLowerCase()}`} accept={l?.extensions.join(',')}
              onChange={e => { if (e.target.files) choose(e.target.files); e.target.value = ''; }} />
            {l && <span className="hint">Up to {l.maxFilesPerUpload} files, {l.maxFileMB} MB each: documents, spreadsheets, PDF, images, e-mails, text and archives.</span>}
          </div>
          {picked.length > 0 && (
            <div className="attach-picked">
              <ul>{picked.map((f, i) => <li key={i}><span className="mono">{f.name}</span> <span className="muted">{fmtSize(f.size)}</span>
                <button className="linkbtn" onClick={() => setPicked(p => p.filter((_, j) => j !== i))} aria-label={`Do not upload ${f.name}`}>✕</button></li>)}</ul>
              <input className="input" aria-label="Description of the files (optional)" placeholder="Description (optional), e.g. Signed SLA annex" value={description} maxLength={500} onChange={e => setDescription(e.target.value)} />
              <button className="btn btn-primary" disabled={busy} onClick={send}>{busy ? 'Uploading…' : `Upload ${picked.length} file(s)`}</button>
            </div>
          )}
          {error.length > 0 && <ul className="err attach-err" role="alert">{error.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
      {q.isLoading ? <StateMessage kind="loading" /> : files.length === 0 ? <div className="panel-body"><StateMessage kind="none">No files attached.</StateMessage></div> : (
        <table className="grid">
          <caption className="sr">{title}</caption>
          <thead><tr><th>File</th><th className="num">Size</th><th>Uploaded</th><th /></tr></thead>
          <tbody>{files.map(a => (
            <tr key={a.id}>
              <td><a href={`/api/v1/attachments/${a.id}/download`} download={a.fileName}>{a.fileName}</a>{a.description && <div className="hint">{a.description}</div>}</td>
              <td className="num nowrap">{fmtSize(a.sizeBytes)}</td>
              <td className="nowrap">{fmtDateTime(a.createdAt)}<div className="hint">{a.uploadedBy?.name ?? '—'}</div></td>
              <td className="row-actions">{((a.uploadedById === me.id && canEdit) || canDeleteAny) && <button className="linkbtn danger-link" onClick={() => remove(a)} aria-label={`Remove ${a.fileName}`}>Remove</button>}</td>
            </tr>))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
