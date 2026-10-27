import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const avatarStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type AvatarStylingProps = Pick<StylingPropCollection, (typeof avatarStylingProps)[number]>;


/** The props of the React component of the indicator component "Avatar". */
export interface AvatarProps extends AvatarStylingProps {
  /** This prop can be used to set the avatar image, parallel to the src attribute of an <img>
   * element. If no image is specified, a placeholder icon is displayed, see prop
   * "placeholderIcon". */
  readonly src?: string;
  /** The prop "dim" specifies the diameter of the avatar in pixels. Dafault value: 40. */
  readonly dim?: number;
  /** Setting this prop to true will move the avatar with a short animation. */
  readonly active?: boolean;
  /** If no image (see prop "src") is passed to the avatar, this placeholder icon is displayed
   * instead. Default value: "USERNEUTRAL". */
  readonly placeholderIcon?: string;
}
