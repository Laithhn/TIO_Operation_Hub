import { useId, useState, type ReactNode } from 'react';

export type FilterChip = { key: string; label: string; onClear: () => void };

/** A102: the filters people use most, the specialist ones under Advanced filters, and what is active as chips that can be removed one by one or together. */
export function FilterBar({ common, advanced, advancedCount = 0, chips = [], onClearAll, className }: { common: ReactNode; advanced?: ReactNode; advancedCount?: number; chips?: FilterChip[]; onClearAll?: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`filterbar${className ? ` ${className}` : ''}`}>
      <div className="toolbar filterbar-row">
        {common}
        {advanced && <button type="button" className="btn filterbar-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>Advanced filters{advancedCount > 0 ? ` (${advancedCount})` : ''} <span aria-hidden="true" className="caret">{open ? '▴' : '▾'}</span></button>}
      </div>
      {advanced && open && <div className="toolbar filterbar-row filterbar-advanced" id={id}>{advanced}</div>}
      {chips.length > 0 && <div className="filterbar-chips" role="group" aria-label="Active filters">
        <span className="flabel">Active filters</span>
        {chips.map(c => <button key={c.key} type="button" className="filter-chip" aria-label={`Remove filter ${c.label}`} onClick={c.onClear}>{c.label} <span aria-hidden="true">×</span></button>)}
        {onClearAll && <button type="button" className="linkbtn" onClick={onClearAll}>Clear all</button>}
      </div>}
    </div>
  );
}
