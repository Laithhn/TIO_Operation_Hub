import type { CellMetaData, ColumnGroupId, DatasetId } from '../tablePreparer.types';


export interface UseCellMeasurerProps {
  readonly ref: React.RefObject<HTMLElement | null>;
  readonly columnGroupId: ColumnGroupId;
  readonly datasetId: DatasetId;
  readonly cellMetaData: CellMetaData;
}
