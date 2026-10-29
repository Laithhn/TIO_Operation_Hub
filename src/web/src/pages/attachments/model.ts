// A74 attachments (29 Oct 2026 redesign): the list's derived values — file kind, category, search, filters, sort and summary.
// The server stores no category or version for a file: the category here is the file's kind, read from its extension.
import type { UserRef } from '../../api';

export type Attachment = { id: number; fileName: string; contentType: string; sizeBytes: number; sha256: string; description?: string; createdAt: string; uploadedBy?: UserRef; uploadedById?: number };
export type Limits = { maxFileMB: number; maxFilesPerUpload: number; extensions: string[] };

export const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export const extensionOf = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '');
/** The type column: PDF, DOCX, XLSX… */
export const typeOf = (name: string) => extensionOf(name).slice(1).toUpperCase() || 'FILE';

export type Category = { key: string; label: string; icon: string };
const CATEGORIES: [Category, string[]][] = [
  [{ key: 'pdf', label: 'PDF document', icon: 'PDF' }, ['.pdf']],
  [{ key: 'document', label: 'Document', icon: 'WORD' }, ['.doc', '.docx', '.rtf', '.odt']],
  [{ key: 'spreadsheet', label: 'Spreadsheet', icon: 'EXCEL' }, ['.xls', '.xlsx', '.csv', '.ods']],
  [{ key: 'presentation', label: 'Presentation', icon: 'POWERPOINT' }, ['.ppt', '.pptx', '.odp']],
  [{ key: 'diagram', label: 'Diagram', icon: 'HIERARCHY' }, ['.vsd', '.vsdx']],
  [{ key: 'image', label: 'Image', icon: 'IMAGE' }, ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']],
  [{ key: 'email', label: 'E-mail', icon: 'EMAIL' }, ['.msg', '.eml']],
  [{ key: 'text', label: 'Text and log', icon: 'TEXT' }, ['.txt', '.log', '.md']],
  [{ key: 'data', label: 'Data file', icon: 'CODE' }, ['.xml', '.json']],
  [{ key: 'archive', label: 'Archive', icon: 'PACKAGE' }, ['.zip', '.7z']]
];
const OTHER: Category = { key: 'other', label: 'Other', icon: 'FILE' };
export const categoryOf = (name: string): Category => CATEGORIES.find(([, ext]) => ext.includes(extensionOf(name)))?.[0] ?? OTHER;

/** How the preview panel can show a file: inline frame (PDF, through /preview), image, plain text, or not at all. */
export type PreviewKind = 'pdf' | 'image' | 'text' | 'none';
export function previewKind(name: string): PreviewKind {
  const k = categoryOf(name).key;
  return k === 'pdf' ? 'pdf' : k === 'image' ? 'image' : k === 'text' || k === 'data' || extensionOf(name) === '.csv' ? 'text' : 'none';
}

export type SortKey = 'name' | '-name' | '-date' | 'date' | 'size' | '-size';
export const SORTS: { value: SortKey; label: string }[] = [
  { value: '-date', label: 'Newest first' }, { value: 'date', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' }, { value: '-name', label: 'Name Z–A' },
  { value: 'size', label: 'Size, smallest first' }, { value: '-size', label: 'Size, largest first' }
];

export type View = { q: string; category: string; type: string; sort: SortKey };
export const DEFAULT_VIEW: View = { q: '', category: '', type: '', sort: '-date' };

export function applyView(rows: Attachment[], v: View): Attachment[] {
  const needle = v.q.trim().toLowerCase();
  const kept = rows.filter(a => (!needle || a.fileName.toLowerCase().includes(needle)) && (!v.category || categoryOf(a.fileName).key === v.category) && (!v.type || typeOf(a.fileName) === v.type));
  const desc = v.sort.startsWith('-');
  const key = v.sort.replace('-', '');
  const cmp = (x: Attachment, y: Attachment) =>
    key === 'name' ? x.fileName.localeCompare(y.fileName, undefined, { numeric: true, sensitivity: 'base' })
      : key === 'size' ? x.sizeBytes - y.sizeBytes
        : Date.parse(x.createdAt) - Date.parse(y.createdAt);
  // Equal keys keep the newest first, so the order never depends on the server's.
  return [...kept].sort((x, y) => (desc ? -cmp(x, y) : cmp(x, y)) || Date.parse(y.createdAt) - Date.parse(x.createdAt) || y.id - x.id);
}

export function summarize(rows: Attachment[]) {
  const uploaders = new Set(rows.map(a => a.uploadedById ?? a.uploadedBy?.id).filter((x): x is number => x !== undefined && x !== null));
  const latest = rows.reduce<Attachment | undefined>((m, a) => (!m || Date.parse(a.createdAt) > Date.parse(m.createdAt) ? a : m), undefined);
  return {
    total: rows.length,
    categories: new Set(rows.map(a => categoryOf(a.fileName).key)).size,
    uploaders: uploaders.size,
    unknownUploader: rows.some(a => !a.uploadedBy && !a.uploadedById),
    latest
  };
}

/** The categories and types present in the list, for the filter drop-downs. */
export function facets(rows: Attachment[]) {
  const cats = new Map<string, Category>();
  rows.forEach(a => { const c = categoryOf(a.fileName); cats.set(c.key, c); });
  return {
    categories: [...cats.values()].sort((a, b) => a.label.localeCompare(b.label)),
    types: [...new Set(rows.map(a => typeOf(a.fileName)))].sort()
  };
}

/** Checked in the browser for a quick answer; the server checks again with the same limits. */
export function checkFiles(list: File[], limits: Limits | undefined, alreadyPicked = 0): string[] {
  const problems: string[] = [];
  if (!limits) return problems;
  for (const f of list) {
    const ext = extensionOf(f.name);
    if (!limits.extensions.includes(ext)) problems.push(`${f.name}: ${ext || 'files without an extension'} not accepted.`);
    else if (f.size > limits.maxFileMB * 1048576) problems.push(`${f.name}: larger than ${limits.maxFileMB} MB.`);
    else if (f.size === 0) problems.push(`${f.name}: empty.`);
  }
  if (alreadyPicked + list.length > limits.maxFilesPerUpload) problems.push(`Upload at most ${limits.maxFilesPerUpload} files at a time.`);
  return problems;
}

/** The uploader removes their own file with Edit records; Delete records removes any (as the server checks). */
export const canRemove = (a: Attachment, meId: number, canEdit: boolean, canDeleteAny: boolean) => (a.uploadedById === meId && canEdit) || canDeleteAny;
