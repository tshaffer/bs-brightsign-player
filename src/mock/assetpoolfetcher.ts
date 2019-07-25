import {
  Asset,
  AssetPool,
  AssetPoolFetcherParams,
} from '@brightsign/assetpoolfetcher';

export default class AssetPoolFetcher {

  fileevent: EventListener;
  progressevent: EventListener;

  constructor(pool: AssetPool) {
    return;
  }

  addEventListener(type: any, listener: any): any {
    return;
  }

  start(list: Asset[], assetPoolParams?: AssetPoolFetcherParams): Promise<void> {
    return Promise.resolve();
  }

  cancel(): Promise<void> {
    return Promise.resolve();
  }

}