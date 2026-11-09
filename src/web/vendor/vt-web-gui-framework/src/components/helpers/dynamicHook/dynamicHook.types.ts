export interface DynamicHookProps {
  readonly path?: string;
  readonly onSetHook?: () => void;
}


export interface InnerDynamicHookProps {
  readonly hook: () => void;
}
