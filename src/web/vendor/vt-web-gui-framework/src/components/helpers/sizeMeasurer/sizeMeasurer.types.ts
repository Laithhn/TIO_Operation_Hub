export interface SizeMeasurerProps {
  className?: string;
  style?: React.CSSProperties;
  disableWidth?: boolean;
  disableHeight?: boolean;
  children: ({ clientWidth, clientHeight }: { clientWidth: number | null; clientHeight: number | null }) => React.ReactNode;
}
