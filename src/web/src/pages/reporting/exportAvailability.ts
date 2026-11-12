/**
 * TIO-BUG-005: why an export's details and file are hidden from the person looking at it, in words, and where they can go instead.
 * The server decides the masking (access fingerprint, owner, schedule state) and sends only a category; nothing here reveals the
 * hidden filters, rows, columns or file. "Completed" stays the historical generation result; this is about access now.
 */
export type DetailsAvailability = 'Available' | 'AccessChanged' | 'LegacyExport' | 'OtherOwner' | 'ScheduleNotCompleted';

export type ExportAvailability = {
  masked: boolean;
  /** Short text for the history table. */
  short: string;
  /** Full explanation for the details dialog. */
  message: string;
  /** Where to configure a new report under current access (navigation only: nothing is generated, scheduled or sent). */
  regenerateTo?: string;
};

type JobLike = { detailsAvailability?: string | null; report: string; builder?: boolean; canDownload?: boolean };

export function exportAvailability(j: JobLike, canConfigure: boolean): ExportAvailability {
  const a = (j.detailsAvailability ?? 'Available') as DetailsAvailability;
  const target = canConfigure ? (j.builder ? '/reporting-center/builder/cases' : `/reporting-center/library?report=${encodeURIComponent(j.report)}`) : undefined;
  const again = canConfigure ? ' To get the data, configure the report again; the new file follows your current access.' : '';
  switch (a) {
    case 'Available':
      return { masked: false, short: '', message: '' };
    case 'AccessChanged':
      return { masked: true, short: 'Unavailable: your access changed', message: `This export was generated, but your access has changed since then, so its details and file are hidden.${again}`, regenerateTo: target };
    case 'LegacyExport':
      return { masked: true, short: 'Unavailable: older export', message: `This export was generated before the access in force was recorded with each file, so its details and file stay hidden.${again}`, regenerateTo: target };
    case 'OtherOwner':
      return { masked: true, short: 'Generated for someone else', message: 'This export was generated for another person. Only they can see its details and download it.' };
    case 'ScheduleNotCompleted':
      return { masked: true, short: 'Unavailable: run not completed', message: 'This scheduled run did not complete, so its details are hidden. The schedule owner can review the schedule.' };
    default:
      return { masked: true, short: 'Details unavailable', message: 'The details of this export are not available to you.' };
  }
}
