import type { CellMetaData, ColumnGroupId, DatasetId } from 'components/helpers/tablePreparer';


export interface DatasetPartProps {
  readonly columnGroupId: ColumnGroupId;
  readonly datasetId: DatasetId;
  readonly posX: number;
  readonly posY: number;
  readonly isRtl: boolean;
  readonly gridTemplateRows: React.CSSProperties['gridTemplateRows'];
  readonly gridTemplateColumns: React.CSSProperties['gridTemplateColumns'];
  readonly gridTemplateAreas: React.CSSProperties['gridTemplateAreas'];
  readonly topLine: boolean;
  readonly bottomLine: boolean;
  readonly endLine: boolean;
  readonly cellsMetaData: CellMetaData[];
}
