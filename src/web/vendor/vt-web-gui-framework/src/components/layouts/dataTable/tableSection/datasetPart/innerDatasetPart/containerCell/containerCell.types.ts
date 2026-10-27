import type { CellIterator } from '../../../../dataTable.types';
import type { CommonCellData } from '../innerDatasetPart.types';


export type ContainerCellProps = CommonCellData & Readonly<Pick<NonNullable<ReturnType<CellIterator>>, 'placeSelf' | 'alignSelf' | 'justifySelf' | 'content'>>;
