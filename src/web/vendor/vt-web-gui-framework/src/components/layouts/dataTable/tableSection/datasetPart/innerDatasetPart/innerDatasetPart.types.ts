import type {
  CellId, CellMetaData, ColumnGroupId, DatasetId,
} from 'components/helpers/tablePreparer';

import type { CellIterator } from '../../../dataTable.types';


export interface CommonCellData {
  readonly tableId: string | undefined;
  readonly columnGroupId: ColumnGroupId;
  readonly datasetId: DatasetId;
  readonly cellId: CellId;
  readonly cellMetaData: CellMetaData;
}


export interface InnerDatasetPartProps {
  readonly tableId: string | undefined;
  readonly columnGroupId: ColumnGroupId;
  readonly datasetId: DatasetId;
  readonly isRtl: boolean;
  readonly gridTemplateRows: React.CSSProperties['gridTemplateRows'];
  readonly gridTemplateColumns: React.CSSProperties['gridTemplateColumns'];
  readonly gridTemplateAreas: React.CSSProperties['gridTemplateAreas'];
  readonly columnGap: string;
  readonly endLine: false | string;
  readonly cellIterator: CellIterator;
  readonly cellsMetaData: CellMetaData[];
}
