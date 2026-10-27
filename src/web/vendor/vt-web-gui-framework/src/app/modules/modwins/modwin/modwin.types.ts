import type { ContentHandle } from 'app/modules/content';


export interface ModwinPosition {
  left: number;
  width: number;
  top: number;
  height: number;
}


export interface ModwinProps {
  readonly ref: React.Ref<ContentHandle | null>;
  readonly id: string;
  readonly onClose: (id: string) => void;
}
