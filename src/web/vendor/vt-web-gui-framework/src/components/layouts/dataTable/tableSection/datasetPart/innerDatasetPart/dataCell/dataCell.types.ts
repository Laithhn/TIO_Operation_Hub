import type { CellIterator } from '../../../../dataTable.types';
import type { CommonCellData } from '../innerDatasetPart.types';


export type DataCellProps = CommonCellData & Readonly<Pick<NonNullable<ReturnType<CellIterator>>, 'placeSelf' | 'alignSelf' | 'justifySelf' | 'textAlign' | 'backgroundColor' | 'valueSize' | 'valueColor' | 'disabled' | 'content' | 'onClick'>>;
