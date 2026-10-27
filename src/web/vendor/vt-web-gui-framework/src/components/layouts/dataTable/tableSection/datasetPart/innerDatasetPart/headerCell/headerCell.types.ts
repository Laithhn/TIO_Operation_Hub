import type { CellIterator } from '../../../../dataTable.types';
import type { CommonCellData } from '../innerDatasetPart.types';


export type HeaderCellProps = CommonCellData & Readonly<Pick<NonNullable<ReturnType<CellIterator>>, 'placeSelf' | 'alignSelf' | 'justifySelf' | 'textAlign' | 'label' | 'sortOrder' | 'onClick'>>;
