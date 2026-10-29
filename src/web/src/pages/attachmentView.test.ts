import { describe, expect, it } from 'vitest';
import { checkFiles, DEFAULT_FILTER, fileCategory, fileType, fmtSize, pageList, previewKind, previewMime, summarize, viewAttachments, type Attachment } from './attachmentView';

const file = (id: number, fileName: string, sizeBytes: number, createdAt: string, uploadedById?: number): Attachment =>
  ({ id, fileName, sizeBytes, createdAt, contentType: '', sha256: '', uploadedById, uploadedBy: uploadedById ? { id: uploadedById, name: `User ${uploadedById}`, isActive: true } : undefined });

const files = [
  file(1, 'Scope.V1.0.docx', 5_000_000, '2026-10-20T10:00:00Z', 1),
  file(2, 'scope-annex.pdf', 300_000, '2026-10-22T10:00:00Z', 2),
  file(3, 'Hardware.xlsx', 36_000, '2026-10-21T10:00:00Z', 1),
  file(4, 'README', 10, '2026-10-19T10:00:00Z', 1),
  file(5, 'file10.txt', 20, '2026-10-18T10:00:00Z', 1),
  file(6, 'file9.txt', 20, '2026-10-18T10:00:00Z', 1)
];
const ids = (rows: Attachment[]) => rows.map(a => a.id);

describe('attachment view (A63)', () => {
  it('derives type and category from the extension', () => {
    expect(fileType('a.b.PDF')).toBe('PDF');
    expect(fileType('README')).toBe('');
    expect(fileCategory('x.docx')).toBe('Document');
    expect(fileCategory('x.csv')).toBe('Spreadsheet');
    expect(fileCategory('x.exe')).toBe('Other');
    expect(fileCategory('README')).toBe('Other');
  });

  it('previews PDF, images and text only, with a type fixed by the extension', () => {
    expect(previewKind('a.pdf')).toBe('pdf');
    expect(previewKind('a.JPG')).toBe('image');
    expect(previewKind('a.json')).toBe('text');
    expect(previewKind('a.docx')).toBe('none');
    expect(previewKind('a.html')).toBe('none');
    expect(previewMime('a.jpg')).toBe('image/jpeg');
    expect(previewMime('a.xml')).toBe('text/plain;charset=utf-8');
  });

  it('searches case-insensitively and combines filters', () => {
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, search: 'SCOPE' }))).toEqual([2, 1]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, search: 'scope', category: 'PDF' }))).toEqual([2]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, type: 'XLSX' }))).toEqual([3]);
    expect(viewAttachments(files, { ...DEFAULT_FILTER, search: 'nothing' })).toEqual([]);
  });

  it('sorts by every supported order without changing the input', () => {
    const copy = [...files];
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'newest' }))).toEqual([2, 3, 1, 4, 6, 5]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'oldest' }))).toEqual([6, 5, 4, 1, 3, 2]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'name-asc' }))).toEqual([6, 5, 3, 4, 2, 1]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'name-desc' }))).toEqual([1, 2, 4, 3, 5, 6]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'size-asc' })).slice(0, 2)).toEqual([4, 6]);
    expect(ids(viewAttachments(files, { ...DEFAULT_FILTER, sort: 'size-desc' }))[0]).toBe(1);
    expect(files).toEqual(copy);
  });

  it('summarizes from the data, with unknown uploaders not counted as zero', () => {
    expect(summarize(files)).toEqual({ total: 6, categories: 5, uploaders: 2, latest: '2026-10-22T10:00:00Z' });
    expect(summarize([])).toEqual({ total: 0, categories: 0, uploaders: 0, latest: null });
    expect(summarize([file(9, 'a.pdf', 1, '2026-10-01T00:00:00Z')]).uploaders).toBeNull();
  });

  it('lists page numbers with gaps', () => {
    expect(pageList(1, 3)).toEqual([1, 2, 3]);
    expect(pageList(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageList(1, 12)).toEqual([1, 2, null, 12]);
    expect(pageList(12, 12)).toEqual([1, null, 11, 12]);
  });

  it('checks files against the server limits', () => {
    const limits = { maxFileMB: 1, maxFilesPerUpload: 2, extensions: ['.pdf'] };
    const f = (name: string, size: number) => ({ name, size }) as File;
    expect(checkFiles([f('a.pdf', 10)], limits, 0)).toEqual([]);
    expect(checkFiles([f('a.exe', 10)], limits, 0)).toEqual(['a.exe: .exe not accepted.']);
    expect(checkFiles([f('a.pdf', 2 * 1048576)], limits, 0)).toEqual(['a.pdf: larger than 1 MB.']);
    expect(checkFiles([f('a.pdf', 0)], limits, 0)).toEqual(['a.pdf: empty.']);
    expect(checkFiles([f('a.pdf', 1)], limits, 2)).toEqual(['Upload at most 2 files at a time.']);
    expect(checkFiles([f('a.exe', 1)], undefined, 0)).toEqual([]);
    expect(fmtSize(326_656)).toBe('319 KB');
  });
});
