import { describe, expect, it } from 'vitest';
import { applyView, canRemove, categoryOf, checkFiles, DEFAULT_VIEW, facets, previewKind, summarize, typeOf, type Attachment } from './model';

const row = (id: number, fileName: string, sizeBytes: number, createdAt: string, uploadedById?: number): Attachment => ({
  id, fileName, sizeBytes, createdAt, uploadedById, contentType: 'application/octet-stream', sha256: '',
  uploadedBy: uploadedById ? { id: uploadedById, name: `User ${uploadedById}`, isActive: true } : undefined
});
const rows = [
  row(1, 'SLA Annex.pdf', 2_000, '2026-10-01T10:00:00Z', 7),
  row(2, 'capacity.XLSX', 50_000, '2026-10-20T10:00:00Z', 8),
  row(3, 'rack photo.png', 400, '2026-10-10T10:00:00Z', 7),
  row(4, 'notes', 10, '2026-10-05T10:00:00Z')
];
const names = (list: Attachment[]) => list.map(a => a.fileName);

describe('attachment list view', () => {
  it('derives type and category from the extension, case-insensitively', () => {
    expect(typeOf('capacity.XLSX')).toBe('XLSX');
    expect(typeOf('notes')).toBe('FILE');
    expect(categoryOf('capacity.XLSX').key).toBe('spreadsheet');
    expect(categoryOf('notes').key).toBe('other');
    expect(previewKind('a.PDF')).toBe('pdf');
    expect(previewKind('a.json')).toBe('text');
    expect(previewKind('a.docx')).toBe('none');
  });

  it('searches file names case-insensitively and combines filters', () => {
    expect(names(applyView(rows, { ...DEFAULT_VIEW, q: 'sla' }))).toEqual(['SLA Annex.pdf']);
    expect(names(applyView(rows, { ...DEFAULT_VIEW, category: 'image' }))).toEqual(['rack photo.png']);
    expect(names(applyView(rows, { ...DEFAULT_VIEW, q: 'a', type: 'PDF' }))).toEqual(['SLA Annex.pdf']);
    expect(applyView(rows, { ...DEFAULT_VIEW, q: 'nothing' })).toHaveLength(0);
  });

  it('sorts by name, date and size in both directions', () => {
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: '-date' }))[0]).toBe('capacity.XLSX');
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: 'date' }))[0]).toBe('SLA Annex.pdf');
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: 'name' }))).toEqual(['capacity.XLSX', 'notes', 'rack photo.png', 'SLA Annex.pdf']);
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: '-name' }))[0]).toBe('SLA Annex.pdf');
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: 'size' }))[0]).toBe('notes');
    expect(names(applyView(rows, { ...DEFAULT_VIEW, sort: '-size' }))[0]).toBe('capacity.XLSX');
  });

  it('summarizes counts from the data, saying when an uploader is unknown', () => {
    const s = summarize(rows);
    expect(s).toMatchObject({ total: 4, categories: 4, uploaders: 2, unknownUploader: true });
    expect(s.latest?.id).toBe(2);
    expect(summarize([])).toMatchObject({ total: 0, categories: 0, uploaders: 0, latest: undefined });
    expect(facets(rows).types).toEqual(['FILE', 'PDF', 'PNG', 'XLSX']);
  });

  it('checks files against the server limits and the delete right', () => {
    const limits = { maxFileMB: 1, maxFilesPerUpload: 2, extensions: ['.pdf', '.txt'] };
    const file = (name: string, size: number) => new File([new Uint8Array(size)], name);
    expect(checkFiles([file('setup.exe', 3)], limits)).toEqual(['setup.exe: .exe not accepted.']);
    expect(checkFiles([file('big.pdf', 1_200_000)], limits)[0]).toContain('larger than 1 MB');
    expect(checkFiles([file('a.txt', 1), file('b.txt', 1)], limits, 1)).toContain('Upload at most 2 files at a time.');
    expect(checkFiles([file('a.txt', 1)], limits)).toEqual([]);
    expect(canRemove(rows[0], 7, true, false)).toBe(true);
    expect(canRemove(rows[0], 8, true, false)).toBe(false);
    expect(canRemove(rows[0], 8, false, true)).toBe(true);
  });
});
