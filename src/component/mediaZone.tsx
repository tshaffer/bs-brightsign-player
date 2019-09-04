import * as React from 'react';
import * as fs from 'fs-extra';
import { isNil } from 'lodash';
import * as sizeOf from 'image-size';

import isomorphicPath from 'isomorphic-path';

import { Image } from './index';
import { Video } from './index';

import {
  ContentItemType,
} from '@brightsign/bscore';

import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';
import { DmEvent } from '@brightsign/bsdatamodel';

import { DmMediaContentItem } from '@brightsign/bsdatamodel';

import {
  DmDerivedContentItem,
  dmGetMediaStateById,
  dmGetEventIdsForMediaState,
  dmGetEventById,
  DmcEvent,
  BsDmIdNone,
} from '@brightsign/bsdatamodel';
import { getPoolFilePath, tmpSetVideoElementRef } from '../index';
import { connect } from 'react-redux';
import { getActiveMediaStateId } from '../selector/hsm';
import { isString } from 'lodash';
import { getActiveMrssDisplayItem } from '../selector/activeMrssDisplayItem';
import { getActiveMediaListDisplayItem } from '../selector/activeMediaListDisplayItem';
import { ArMediaFeedItem } from '../type/dataFeed';
import { isNullOrUndefined } from 'util';
import { MediaListItem } from '../type/mediaListItem';

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
  activeMrssDisplayItem: ArMediaFeedItem;
  activeMediaListDisplayItem: MediaListItem;
  postBSPMessage: any;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default class MediaZoneComponent extends React.Component<MediaZoneProps> {

  constructor(props: MediaZoneProps) {
    super(props);
  }

  videoRefRetrieved(videoElementRef: any) {
    console.log('mediaZone.tsx#videoRefRetrieved');
    tmpSetVideoElementRef(videoElementRef);
  }

  renderMediaItem(mediaState: DmMediaState, contentItem: DmDerivedContentItem) {

    const self = this;

    const mediaContentItem: DmMediaContentItem = contentItem as DmMediaContentItem;

    const fileId: string = mediaState.name;

    const poolFilePath: string = getPoolFilePath(fileId);
    const src: string = isomorphicPath.join('file://', poolFilePath);

    const mediaType: ContentItemType = mediaContentItem.type;

    switch (mediaType.toString().toLowerCase()) {
      case 'image': {
        return (
          <Image
            width={this.props.width}
            height={this.props.height}
            src={src}
          />
        );
      }
      case 'video': {
        return (
          <Video
            width={this.props.width}
            height={this.props.height}
            src={src}
            onVideoRefRetrieved={self.videoRefRetrieved}
          />
        );
      }
      default: {
        debugger;
      }
    }

    return null;
  }

  renderMediaListDisplayItem() {

    const self = this;

    if (!isNil(this.props.activeMediaListDisplayItem)) {

      const mediaListItem = this.props.activeMediaListDisplayItem;
      console.log(mediaListItem);

      // const poolFilePath: string = getPoolFilePath(mediaListItem.filePath);
      // const src = isomorphicPath.join('file://', poolFilePath);
      const src = isomorphicPath.join('file://', mediaListItem.filePath);
      const mediaType: ContentItemType = mediaListItem.contentItemType;

      /*
                    width={this.props.width}
                    height={this.props.height}
      */
      switch (mediaType.toString().toLowerCase()) {
        case 'image': {
          return (
            <Image
              src={src}
              width={this.props.width}
              height={this.props.height}

            />
          );
        }
        case 'video': {
          return (
            <Video
              width={this.props.width}
              height={this.props.height}
              src={src}
              onVideoRefRetrieved={self.videoRefRetrieved}
            />
          );
        }
        default: {
          debugger;
        }
      }
    }
    return null;
  }

  renderMrssDisplayItem() {

    console.log(this.props.activeMrssDisplayItem);

    const self = this;

    if (!isNil(this.props.activeMrssDisplayItem)) {
      const dataFeedItem: ArMediaFeedItem = this.props.activeMrssDisplayItem;

      const src: string = isomorphicPath.join('file://', dataFeedItem.filePath);

      // does this work for videos?
      const dimensions = sizeOf(dataFeedItem.filePath);
      const { width, height } = dimensions;

      const laptopMaxWidth = 1420;
      const laptopMaxHeight = 780;

      // scale down to get to screen size
      const widthScaleFactor = width / laptopMaxWidth;
      const heightScaleFactor = height / laptopMaxHeight;
      let scaledWidth: number;
      let scaledHeight: number;
      if (widthScaleFactor > heightScaleFactor) {
        scaledWidth = width / widthScaleFactor;
        scaledHeight = height / widthScaleFactor;
      }
      else {
        scaledWidth = width / heightScaleFactor;
        scaledHeight = height / heightScaleFactor;
      }

      console.log('width: ', width);
      console.log('height: ', height);
      console.log('scaledWidth: ', scaledWidth);
      console.log('scaledHeight: ', scaledHeight);

      switch (dataFeedItem.medium) {
        case 'image':
          return (
            <Image
              src={src}
              width={scaledWidth}
              height={scaledHeight}
            />
          );
        case 'video':
          return (
            <Video
              width={this.props.width}
              height={this.props.height}
              src={src}
              onVideoRefRetrieved={self.videoRefRetrieved}
            />
          );
        default:
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
      case ContentItemType.Image:
      case ContentItemType.Video: {
        // case 'Image': {
        // case 'Video': {
        return this.renderMediaItem(mediaState, contentItem as DmMediaContentItem);
      }
      case ContentItemType.MrssFeed: {
        return this.renderMrssDisplayItem();
      }
      case ContentItemType.MediaList: {
        return this.renderMediaListDisplayItem();
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

const mapStateToProps = (state: any, ownProps: any): any => {
  return {
    key: state.key,
    bsdm: state.bsdm,
    zone: ownProps.zone,
    width: ownProps.width,
    height: ownProps.height,
    activeMediaStateId: getActiveMediaStateId(state, ownProps.zone.id),
    activeMrssDisplayItem: getActiveMrssDisplayItem(state, ownProps.zone.id),
    activeMediaListDisplayItem: getActiveMediaListDisplayItem(state, ownProps.zone.id),
  };
};

export const MediaZone = connect(mapStateToProps, null)(MediaZoneComponent);
