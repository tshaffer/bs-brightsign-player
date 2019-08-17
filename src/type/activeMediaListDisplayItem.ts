import { MediaListItem } from './mediaListItem';

export interface MediaListDisplayItemMap {
  [hsmId: string]: MediaListItem | null;
}