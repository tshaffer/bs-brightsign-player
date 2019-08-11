import {
  AccessType,
  AudioMappingType,
  AudioMixModeType,
  AudioModeType,
  AudioOutputSelectionType,
  BsAssetItem,
  BsColor,
  BsRect,
  CompareOperator,
  DataFeedUsageType,
  DataFeedType,
  EventIntrinsicAction,
  ImageModeType,
  MediaListPlaybackType,
  MosaicMaxContentResolutionType,
  RotationType,
  SystemVariableType,
  TextHAlignmentType,
  TextScrollingMethodType,
  TransitionType,
  TwitterFeedRestrictionType,
  ViewModeType,
  GraphicsZOrderType,
} from '@brightsign/bscore';

import {
  DmAudioZonePropertyData,
  DmcCommand,
  DmcEvent,
  DmMediaState,
  DmImageZonePropertyData,
  DmSignHardwareConfiguration,
  DmSignProperties, DmTickerZonePropertyData,
  DmVideoZonePropertyData,
  DmPartnerProductCollectionState,
} from '@brightsign/bsdatamodel';

import {
  ArEventType,
  ArState,
} from './runtime';

export type ArCommand = any;

export interface ArMediaPlaylistItem extends ArState {
  fileName: string;
  filePath: string;
  type?: string;
}

export interface TransitionEffect {
  transitionType: TransitionType;
  transitionDuration: number;
}

export interface ArImagePlaylistItem extends ArMediaPlaylistItem {
  transitionEffect: TransitionEffect;
}

export interface ArVideoItem extends ArMediaPlaylistItem {
  videoDisplayMode: any;        // VideoDisplayModeType
  automaticallyLoop: boolean;
}

export interface ArAudioItem extends ArMediaPlaylistItem {
  volume: number;
}

export interface ArMediaListItem extends ArState {
  contentItems: ArMediaListItemItem[];
  playbackType: MediaListPlaybackType;
  startIndex: number;
  shuffle: boolean;
  support4KImage: boolean;
  sendZoneMessage: boolean;
  useDataFeed: boolean;
  dataFeedId: string;
  transitionEffect: TransitionEffect;
  transitionToNextEventList: ArEventType[];
  transitionToPreviousEventList: ArEventType[];
  transitionToNextCommands: ArCommand[];
  transitionToPreviousCommands: ArCommand[];
}

export type ArMediaListItemItem = ArImagePlaylistItem | ArVideoItem | ArAudioItem | {};

