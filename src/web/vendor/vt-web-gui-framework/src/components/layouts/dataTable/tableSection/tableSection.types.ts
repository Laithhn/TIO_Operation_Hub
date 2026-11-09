import type { DatasetPartOfColumnGroup } from 'components/helpers/tablePreparer';


export interface TableSectionProps {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly translateX?: number;
  readonly translateY?: number;
  readonly smoothScrolling?: boolean;
  readonly children: DatasetPartOfColumnGroup[];
}
