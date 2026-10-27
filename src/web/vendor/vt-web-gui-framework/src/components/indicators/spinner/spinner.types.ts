import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const spinnerStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type SpinnerStylingProps = Pick<StylingPropCollection, (typeof spinnerStylingProps)[number]>;


export interface SpinnerHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React component of the indicator component "Spinner". */
export interface SpinnerProps extends SpinnerStylingProps {
  /** The React reference of an imperative handle of the spinner component. */
  readonly ref?: React.Ref<SpinnerHandle | null>;
  /** This prop determines the appearance of the loading animation. You can choose between a typical
   * loading circle ("circle", default) and a bar animation ("bars"). */
  readonly type?: 'circle' | 'bars';
  /** The Prop "dim" specifies the diameter of the loading animation. Although any numerical value
   * between 16 and 120 can be entered, one of the space definitions from /assets/styles/space/
   * should be used if possible. Default value: 80 (space.xxl). */
  readonly dim?: number;
}
