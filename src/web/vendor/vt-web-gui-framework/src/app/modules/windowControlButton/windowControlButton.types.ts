import type { UseInteractionsProps } from 'components/hooks/useInteractions';


/** The props of the React component of the app module "WindowControlButton". */
export interface WindowControlButtonProps {
  type: 'minimize' | 'maximize' | 'unmaximize' | 'close';
  onClick?: NonNullable<UseInteractionsProps['onClick']>;
}
