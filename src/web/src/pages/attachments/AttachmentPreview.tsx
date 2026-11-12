import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { fmtDateTime } from '../../format';
import { Icon } from '../../ui/Icon';
import { DL, Person, StateMessage, Tabs } from '../../ui/kit';
import { categoryOf, fmtSize, previewKind, typeOf, type Attachment } from './model';

const TEXT_LIMIT = 256 * 1024;
export const downloadUrl = (a: Attachment) => `/api/v1/attachments/${a.id}/download`;
/** PDFs and images only; the server serves them inline and lets only the hub's pages frame them. */
const previewUrl = (a: Attachment) => `/api/v1/attachments/${a.id}/preview`;

/** Text files are read through the download (no object URL to clean up) and shown as plain text, never as markup. */
function TextPreview({ a }: { a: Attachment }) {
  const q = useQuery({
    queryKey: ['attachment-text', a.id], staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const res = await fetch(downloadUrl(a), { credentials: 'same-origin', signal, headers: TEXT_LIMIT < a.sizeBytes ? { Range: `bytes=0-${TEXT_LIMIT - 1}` } : undefined });
      if (!res.ok) throw new Error(res.status === 404 ? 'The file is missing from the storage folder.' : `The file could not be read (${res.status}).`);
      return res.text();
    }
  });
  if (q.isLoading) return <StateMessage kind="loading" />;
  if (q.error) return <StateMessage kind="error">{(q.error as Error).message}</StateMessage>;
  return <>
    {a.sizeBytes > TEXT_LIMIT && <p className="hint att-pv-note">Showing the first {fmtSize(TEXT_LIMIT)} of {fmtSize(a.sizeBytes)}. Download the file for all of it.</p>}
    <pre className="att-pv-text" tabIndex={0} aria-label={`Contents of ${a.fileName}`}>{q.data}</pre>
  </>;
}

function PreviewBody({ a }: { a: Attachment }) {
  const kind = previewKind(a.fileName);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [a.id]);
  if (kind === 'pdf') return <iframe key={a.id} className="att-pv-frame" src={previewUrl(a)} title={`Preview of ${a.fileName}`} />;
  if (kind === 'image') return broken
    ? <StateMessage kind="error">The image could not be shown. Download it to open it.</StateMessage>
    : <div className="att-pv-image"><img key={a.id} src={previewUrl(a)} alt={a.description || a.fileName} onError={() => setBroken(true)} /></div>;
  if (kind === 'text') return <TextPreview a={a} />;
  return (
    <div className="att-pv-none">
      <span className={`att-ficon big cat-${categoryOf(a.fileName).key}`} aria-hidden="true"><Icon name={categoryOf(a.fileName).icon} size={40} /></span>
      <p><b>No preview for {typeOf(a.fileName)} files.</b></p>
      <p className="muted">The hub shows PDFs, images and text files. Download the file to open it in its application.</p>
      <a className="btn btn-primary" href={downloadUrl(a)} download={a.fileName}>Download</a>
    </div>
  );
}

/**
 * The document beside the list (about a third of the width on wide screens; a full-height drawer on narrower ones).
 * The server keeps one version per file, so Version history says so instead of inventing earlier versions.
 */
export function AttachmentPreview({ a, canDelete, onDelete, onClose, drawer }: { a: Attachment; canDelete: boolean; onDelete: () => void; onClose: () => void; drawer: boolean }) {
  const [tab, setTab] = useState('preview');
  const root = useRef<HTMLElement>(null);
  const kind = previewKind(a.fileName);
  useEffect(() => { root.current?.querySelector<HTMLElement>('.att-pv-close')?.focus(); }, [a.id]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.scrim')) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const cat = categoryOf(a.fileName);
  return (
    <>
      {drawer && <div className="att-pv-scrim" onMouseDown={onClose} aria-hidden="true" />}
      <aside ref={root} className={`att-pv${drawer ? ' drawer' : ''}`} aria-label={`Preview of ${a.fileName}`} role={drawer ? 'dialog' : undefined} aria-modal={drawer || undefined}>
        <header className="att-pv-head">
          <span className={`att-ficon cat-${cat.key}`} aria-hidden="true"><Icon name={cat.icon} size={22} /></span>
          <div className="att-pv-title">
            <h3 title={a.fileName}>{a.fileName}</h3>
            <div className="muted">{typeOf(a.fileName)} · {fmtSize(a.sizeBytes)} · {fmtDateTime(a.createdAt)} · {a.uploadedBy?.name ?? 'Unknown uploader'}</div>
          </div>
          <button type="button" className="btn btn-ghost att-icon-btn att-pv-close" onClick={onClose} aria-label="Close the preview"><Icon name="close" size={16} /></button>
        </header>
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'preview', label: 'Preview' }, { key: 'details', label: 'Details' }, { key: 'versions', label: 'Version history' }]} />
        <div className={`att-pv-body${tab === 'preview' && kind === 'pdf' ? ' fill' : ''}`}>
          {tab === 'preview' && <PreviewBody a={a} />}
          {tab === 'details' && <DL items={[
            ['File name', <span className="att-wrap">{a.fileName}</span>],
            ['File type', `${typeOf(a.fileName)} (${a.contentType})`],
            ['Category', <><span className={`att-cat cat-${cat.key}`}>{cat.label}</span> <span className="hint">by file type</span></>],
            ['Size', `${fmtSize(a.sizeBytes)} (${a.sizeBytes.toLocaleString('en-GB')} bytes)`],
            ['Uploaded on', fmtDateTime(a.createdAt)],
            ['Uploaded by', <Person u={a.uploadedBy} gap="Unknown" />],
            ['Description', a.description],
            ['SHA-256', <span className="mono att-wrap">{a.sha256}</span>]
          ]} />}
          {tab === 'versions' && <StateMessage kind="unknown">Version history is not kept for attachments: each upload is a separate file. To replace a document, upload the new file and delete the old one; the record's change history keeps both.</StateMessage>}
        </div>
        <footer className="att-pv-foot">
          <a className="btn btn-primary" href={downloadUrl(a)} download={a.fileName}><Icon name="download" size={16} /> Download</a>
          {(kind === 'pdf' || kind === 'image') && <a className="btn" href={previewUrl(a)} target="_blank" rel="noopener noreferrer"><Icon name="OPEN" size={16} /> Open in new tab</a>}
          {canDelete && <button type="button" className="btn btn-danger-outline" onClick={onDelete}><Icon name="delete" size={16} /> Delete</button>}
        </footer>
      </aside>
    </>
  );
}
