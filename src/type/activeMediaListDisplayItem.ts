import { DmMediaContentItem } from '@brightsign/bsdatamodel';

export interface MediaListDisplayItemMap {
  [hsmId: string]: DmMediaContentItem | null;
}