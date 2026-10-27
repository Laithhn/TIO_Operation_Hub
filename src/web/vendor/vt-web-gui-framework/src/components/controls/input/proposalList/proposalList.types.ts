export type FilteredList = {
  listIdx: number;
  entry: string;
  formattedEntry: string;
}[];


export interface ProposalListHandle {
  markPrevious: () => void;
  markNext: () => void;
  selectMarked: () => void;
}


export interface ProposalListProps {
  readonly ref: React.RefObject<ProposalListHandle | null>;
  readonly spanElemRef: React.RefObject<HTMLSpanElement | null>;
  readonly show: boolean;
  readonly list: (string | number)[];
  readonly value: string;
  readonly emptyHint: string;
  readonly onSelect: (listIdx: number, event?: React.MouseEvent<HTMLDivElement>) => void;
  readonly onClose: () => void;
}
