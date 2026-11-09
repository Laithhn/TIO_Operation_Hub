import type { ContentData } from 'app/modules/content';


export type InternalLinkProps = React.PropsWithChildren<{
  readonly to: string;
  readonly contentData?: ContentData;
}>;
