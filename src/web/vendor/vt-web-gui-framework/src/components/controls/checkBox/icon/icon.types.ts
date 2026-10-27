import type { CheckBoxStatus, CheckBoxType } from '../checkBox.types';


export interface IconProps {
  readonly type: CheckBoxType;
  readonly large: boolean;
  readonly status: CheckBoxStatus;
  readonly labelFirst: boolean;
  readonly withoutLabel: boolean;
  readonly iconStatus: 'checked' | 'unchecked' | 'mixed';
}
