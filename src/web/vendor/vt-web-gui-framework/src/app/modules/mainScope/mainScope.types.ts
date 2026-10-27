import type { ContentType } from 'app/modules/content';


/** The Redux state of the slice of the app module "MainScope". */
export interface MainScopeState {
  /** Is true, when a content is loaded into the main scope. Default: false. */
  isLoading: boolean;
  /** The type of the content, loaded into the main scope. Default: NONE. */
  contentType: ContentType;
}
