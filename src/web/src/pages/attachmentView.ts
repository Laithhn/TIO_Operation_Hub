// A63: search, filter, sort, page and summary of a record's attachments, done in the browser (the list endpoint returns every file of the record).
import type { UserRef } from '../api';

export type Attachment = { id: number; fileName: string; contentType: string; sizeBytes: number; sha256: string; description?: string; createdAt: string; uploadedBy?: UserRef; uploadedById?: number };
export type Limits = { maxFileMB: number; maxFilesPerUpload: number; extensions: string[] };

export const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

/** File extension in capitals without the dot ("PDF", "DOCX"), or "" when the name has none. */
export const fileType = (name: string) => (/\.([^./\\]+)$/.exec(name)?.[1] ?? '').toUpperCase();

/**
 * Attachments have no category field; the category is the kind of file, derived from its extension, so it is always true and needs no
 * extra input. A business category (Commercial, Testing…) would need a new column and is not invented here.
 */
const KINDS: [string, string[]][] = [
  ['PDF', ['PDF']],
  ['Document', ['DOC', 'DOCX', 'ODT', 'RTF']],
  ['Spreadsheet', ['XLS', 'XLSX', 'ODS', 'CSV']],
  ['Presentation', ['PPT', 'PPTX', 'ODP']],
  ['Diagram', ['VSD', 'VSDX']],
  ['Image', ['PNG', 'JPG', 'JPEG', 'GIF', 'BMP', 'WEBP']],
  ['E-mail', ['MSG', 'EML']],
  ['Text', ['TXT', 'LOG', 'MD']],
  ['Data', ['XML', 'JSON']],
  ['Archive', ['ZIP', '7Z']]
];
export const fileCategory = (name: string) => {
  const t = fileType(name);
  return KINDS.find(([, exts]) => exts.includes(t))?.[0] ?? 'Other';
};

/** How the hub can show the file: PDF (in a new tab, the browser's own viewer), an image or plain text in the pane, or not at all. */
export type PreviewKind = 'pdf' | 'image' | 'text' | 'none';
const IMAGE_TYPES: Record<string, string> = { PNG: 'image/png', JPG: 'image/jpeg', JPEG: 'image/jpeg', GIF: 'image/gif', BMP: 'image/bmp', WEBP: 'image/webp' };
export function previewKind(name: string): PreviewKind {
  const t = fileType(name);
  if (t === 'PDF') return 'pdf';
  if (IMAGE_TYPES[t]) return 'image';
  if (['TXT', 'LOG', 'MD', 'CSV', 'XML', 'JSON'].includes(t)) return 'text';
  return 'none';
}
/** The type the preview blob is given; fixed per extension so a file can never be shown as a web page. */
export const previewMime = (name: string) => {
  const k = previewKind(name);
  return k === 'pdf' ? 'application/pdf' : k === 'image' ? IMAGE_TYPES[fileType(name)] : 'text/plain;charset=utf-8';
};

export type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc';
export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A–Z)' }, { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'size-asc', label: 'Size (smallest first)' }, { value: 'size-desc', label: 'Size (largest first)' }
];

export type ViewFilter = { search: string; category: string; type: string; sort: SortKey };
export const DEFAULT_FILTER: ViewFilter = { search: '', category: '', type: '', sort: 'newest' };

const byName = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const time = (a: Attachment) => Date.parse(a.createdAt) || 0;

/** Matching files in the chosen order. Search is case-insensitive on the file name; ties keep the newest first. */
export function viewAttachments(files: Attachment[], f: ViewFilter): Attachment[] {
  const term = f.search.trim().toLowerCase();
  const rows = files.filter(a => (!term || a.fileName.toLowerCase().includes(term))
    && (!f.category || fileCategory(a.fileName) === f.category)
    && (!f.type || fileType(a.fileName) === f.type));
  const cmp: Record<SortKey, (a: Attachment, b: Attachment) => number> = {
    'newest': (a, b) => time(b) - time(a),
    'oldest': (a, b) => time(a) - time(b),
    'name-asc': (a, b) => byName.compare(a.fileName, b.fileName),
    'name-desc': (a, b) => byName.compare(b.fileName, a.fileName),
    'size-asc': (a, b) => a.sizeBytes - b.sizeBytes,
    'size-desc': (a, b) => b.sizeBytes - a.sizeBytes
  };
  return rows.sort((a, b) => cmp[f.sort](a, b) || time(b) - time(a) || b.id - a.id);
}

export type Summary = { total: number; categories: number; uploaders: number | null; latest: string | null };
/** Figures for the summary cards; uploaders is null when no file records who uploaded it (shown as unknown, not zero). */
export function summarize(files: Attachment[]): Summary {
  const people = new Set(files.map(a => a.uploadedById ?? a.uploadedBy?.id).filter((x): x is number => x !== undefined && x !== null));
  const latest = files.reduce<Attachment | null>((m, a) => (!m || time(a) > time(m) ? a : m), null);
  return { total: files.length, categories: new Set(files.map(a => fileCategory(a.fileName))).size, uploaders: files.length && people.size === 0 ? null : people.size, latest: latest?.createdAt ?? null };
}

/** Page numbers to show, with null for a gap: 1 … 4 5 6 … 12. */
export function pageList(page: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const mid = [page - 1, page, page + 1].filter(p => p > 1 && p < last);
  const out: (number | null)[] = [1];
  if (mid[0] > 2) out.push(null);
  out.push(...mid);
  if (mid[mid.length - 1] < last - 1) out.push(null);
  out.push(last);
  return out;
}

/** Checked in the browser for a quick answer; the server checks again (A46). */
export function checkFiles(list: File[], l: Limits | undefined, alreadyPicked: number): string[] {
  const problems: string[] = [];
  if (!l) return problems;
  for (const f of list) {
    const ext = f.name.includes('.') ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
    if (!l.extensions.includes(ext)) problems.push(`${f.name}: ${ext || 'files without an extension'} not accepted.`);
    else if (f.size > l.maxFileMB * 1048576) problems.push(`${f.name}: larger than ${l.maxFileMB} MB.`);
    else if (f.size === 0) problems.push(`${f.name}: empty.`);
  }
  if (alreadyPicked + list.length > l.maxFilesPerUpload) problems.push(`Upload at most ${l.maxFilesPerUpload} files at a time.`);
  return problems;
}
