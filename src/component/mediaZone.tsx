import * as React from 'react';

import isomorphicPath from 'isomorphic-path';

// import {
//   ArEventType,
// } from '../types';

// import DesktopPlatformService from '../platform/desktop/DesktopPlatformService';

// import MrssDisplayItemContainer from '../containers/mrssDisplayItemContainer';

// import { getPoolFilePath } from '../utilities/utilities';

import { Image } from './index';
import { Video } from './index';

import {
  // dmGetAssetItemById,
} from '@brightsign/bsdatamodel';
// import { BsAssetItem } from "@brightsign/bscore";

import {
  ContentItemType,
  EventType,
} from '@brightsign/bscore';

import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';
import { DmEvent } from '@brightsign/bsdatamodel';

import {
  // DmDataFeedContentItem,
  DmDerivedContentItem,
  DmMediaContentItem,
  // DmEventData,
  // DmTimer,
  dmGetMediaStateById,
  dmGetEventIdsForMediaState,
  dmGetEventById,
  DmcEvent,
} from '@brightsign/bsdatamodel';
// import { ArEventType } from '../type/runtime';
import { getPoolFilePath, getReduxStore, dispatchHsmEvent } from '../index';
import { connect } from 'react-redux';
// import { Dispatch } from 'redux';
// import { bindActionCreators } from 'redux';
import { getActiveMediaStateId } from '../selector/hsm';
import { ArEventType } from '../type/runtime';
import { isString } from 'lodash';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/** @internal */
export interface MediaZoneProps {
  key: string;
  bsdm: DmState;
  zone: DmZone;
  width: number;
  height: number;
  activeMediaStateId: string;
  postBSPMessage: any;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default class MediaZoneComponent extends React.Component<MediaZoneProps> {

  // postBpEvent() {
  //   const event : ArEventType = {
  //     EventType : 'bpEvent',
  //   };
  //   this.props.postBSPMessage(event);
  // }

  // postTimeoutEvent()  {
  //   const event : ArEventType = {
  //     EventType : 'timeoutEvent',
  //   };
  //   this.props.postBSPMessage(event);
  // }

  postMediaEndEvent()  {
    console.log('postMediaEndEvent');
    const event : ArEventType = {
      EventType : EventType.MediaEnd,
    };
    const reduxStore: any = getReduxStore();
    reduxStore.dispatch(dispatchHsmEvent(event));
  }

  renderMediaItem(mediaState: DmMediaState, contentItem: DmDerivedContentItem) {

    const self = this;

    const mediaContentItem: DmMediaContentItem = contentItem as DmMediaContentItem;

    // const assetId: string = mediaContentItem.assetId;
    // const assetItem : BsAssetItem = dmGetAssetItemById(this.props.bsdm, { id : assetId }) as BsAssetItem;

    // TODO - near term (likely) fix
    // const fileId : string = assetItem.name;
    const fileId: string = mediaState.name;

    const poolFilePath: string = getPoolFilePath(fileId);
    const src: string = isomorphicPath.join('file://', poolFilePath);

    const mediaType: ContentItemType = mediaContentItem.type;

    switch (mediaType) {
      case 'Image': {
        return (
          <Image
            width={this.props.width}
            height={this.props.height}
            src={src}
          />
        );
      }
      case 'Video': {
        return (
          <Video
            width={this.props.width}
            height={this.props.height}
            src={src}
            onVideoEnd={self.postMediaEndEvent.bind(this)}
          />
        )
      }
      default: {
        debugger;
      }
    }

    return null;
  }

  getEvents(bsdm: DmState, mediaStateId: string): DmEvent[] {

    let events: DmEvent[] = [];

    const eventIds: BsDmId[] = dmGetEventIdsForMediaState(bsdm, { id: mediaStateId });

    events = eventIds.map((eventId) => {
      return dmGetEventById(bsdm, { id: eventId }) as DmcEvent;
    });

    return events;
  }

  render() {

    const mediaStateId: string = this.props.activeMediaStateId;
    if (!isString(mediaStateId) || mediaStateId.length === 0) {
      return null;
    }
    const mediaState: DmMediaState = dmGetMediaStateById(this.props.bsdm, { id: mediaStateId }) as DmMediaState;
    const contentItem: DmDerivedContentItem = mediaState.contentItem;

    switch (contentItem.type) {
      case 'Image': {
        return this.renderMediaItem(mediaState, contentItem as DmMediaContentItem);
      }
      case 'Video': {
        return this.renderMediaItem(mediaState, contentItem as DmMediaContentItem);
      }
      default: {
        break;
      }
    }

    return null;
  }
}

// -----------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------

// const mapDispatchToProps = (dispatch: Dispatch<any>) => {
//   return bindActionCreators({
//     postBSPMessage: postMessage,
//   }, dispatch);
// };

// const mapStateToProps = (state: any, ownProps: undefined): Partial<ImageProps> => {
// const mapStateToProps = (state: any, ownProps: undefined): ImageProps => {
const mapStateToProps = (state: any, ownProps: any): any => {
  return {
    key: state.key,
    bsdm: state.bsdm,
    zone: ownProps.zone,
    width: ownProps.width,
    height: ownProps.height,
    activeMediaStateId: getActiveMediaStateId(state, ownProps.zone.id),
  };
};

// export const MediaZone = connect(mapStateToProps, mapDispatchToProps)(MediaZoneComponent);
export const MediaZone = connect(mapStateToProps, null)(MediaZoneComponent);
