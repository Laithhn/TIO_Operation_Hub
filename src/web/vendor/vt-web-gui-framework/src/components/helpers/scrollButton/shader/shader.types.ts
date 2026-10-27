import type { Ground } from 'assets/styles';

import type { ScrollButtonDir } from '../scrollButton.types';


export type ShaderProps = React.PropsWithChildren<{
  readonly dir: ScrollButtonDir;
  readonly show: boolean;
  readonly isRtl: boolean;
  readonly showShader: boolean;
  readonly backgroundColor: string | undefined;
  readonly ground: Ground | undefined;
}>;
