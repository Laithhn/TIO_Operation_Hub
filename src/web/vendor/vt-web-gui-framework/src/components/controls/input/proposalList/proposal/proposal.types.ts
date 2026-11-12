export interface ProposalProps {
  readonly idx: number;
  readonly text: string;
  readonly onClick?: (idx: number, event: React.MouseEvent<HTMLDivElement>) => void;
}
