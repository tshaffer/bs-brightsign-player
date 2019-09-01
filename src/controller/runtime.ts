import { isNil } from 'lodash';

import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';

import { ArSyncSpec, ArFileLUT, ArSyncSpecDownload, ArEventType } from '../type/runtime';
import { HSM } from './hsm/HSM';
import { PlayerHSM } from './hsm/playerHSM';
import { BsBrightSignPlayerState, addUserVariable, BsBrightSignPlayerModelThunkAction } from '../index';
import { Store } from 'redux';
import { BsDmId, dmGetUserVariableIdsForSign, dmGetUserVariableById, DmcUserVariable } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';

import {
  DmSignState,
  dmOpenSign,
  dmGetZonesForSign,
  dmGetZoneById
} from '@brightsign/bsdatamodel';
import { ZoneHSM } from './hsm/zoneHSM';
import { MediaZoneHSM } from './hsm/mediaZoneHSM';

import {
  initializeButtonPanels
} from './device/bp';

// const platform: string = 'Desktop';
// const platform: string = 'BrightSign';
let platform: string;

try {
  const gpio = new BSControlPort('BrightSign') as any;
  console.log('create controlPort: ');
  console.log(gpio);
  platform = 'BrightSign';
}
catch (e) {
  platform = 'Desktop';
  console.log('failed to create controlPort: ');
}
// TEDTODO - failing to create control port - overwrite
// platform = 'BrightSign';

let srcDirectory = '';
if (platform === 'Desktop') {
  // srcDirectory = '/Users/tedshaffer/Desktop/autotron';
  srcDirectory = '/Users/tedshaffer/Desktop/autotron';
}
else {
  const process = require('process');
  process.chdir('/storage/sd');
  srcDirectory = '';
}

import Registry from '@brightsign/registry';
import { ZoneType } from '@brightsign/bscore';
import { TickerZoneHSM } from './hsm/tickerZoneHSM';
const registry: Registry = new Registry();
registry.read('networking', 'ru')
  .then((keyValue) => {
  });

let _autotronStore: Store<BsBrightSignPlayerState>;
let _syncSpec: ArSyncSpec;
let _poolAssetFiles: ArFileLUT;
let _autoSchedule: any;

const _queuedEvents: ArEventType[] = [];
let _hsmList: HSM[] = [];
let _playerHSM: PlayerHSM;



// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------

initializeButtonPanels();

export function getPlatform(): string {
  return platform;
}

export function initRuntime(store: Store<BsBrightSignPlayerState>) {
  return ((dispatch: any, getState: () => BsBrightSignPlayerState) => {
    _autotronStore = store;
    return getRuntimeFiles()
      .then(() => {
        dispatch(launchHSM());
      });
  });
}

export function getReduxStore(): Store<BsBrightSignPlayerState> {
  return _autotronStore;
}

let _videoElementRef: any;
export function tmpSetVideoElementRef(videoElementRef: any) {
  _videoElementRef = videoElementRef;
}
export function tmpGetVideoElementRef(): any {
  return _videoElementRef;
}

export function getRuntimeFiles(): Promise<void> {
  return getSyncSpec()
    .then((syncSpec: ArSyncSpec) => {
      _syncSpec = syncSpec;
      _poolAssetFiles = getPoolAssetFiles(syncSpec, getRootDirectory());
      return getAutoschedule(syncSpec, getRootDirectory());
    }).then((autoSchedule: any) => {
      _autoSchedule = autoSchedule;
      _hsmList = [];
      // launchHSM();
      return Promise.resolve();
    });
}

function launchHSM() {
  return ((dispatch: any) => {
    _playerHSM = new PlayerHSM('playerHSM', startPlayback, restartPlayback, postMessage, queueHsmEvent);
    const action: any = _playerHSM.hsmInitialize().bind(_playerHSM);
    dispatch(action).then(() => {
      const hsmInitializationComplete = hsmInitialized();
      console.log('69696969 - end of launchHSM, hsmInitializationComplete = ' + hsmInitializationComplete);
    });
  });
}

function getAutoschedule(syncSpec: ArSyncSpec, rootPath: string) {
  return getSyncSpecReferencedFile('autoschedule.json', syncSpec, rootPath);
}

function getSyncSpecReferencedFile(fileName: string, syncSpec: ArSyncSpec, rootPath: string): Promise<object> {

  const syncSpecFile: ArSyncSpecDownload | null = getFile(syncSpec, fileName);
  if (syncSpecFile == null) {
    return Promise.reject('file not found');
  }

  // const fileSize = syncSpecFile.size;
  const filePath: string = isomorphicPath.join(rootPath, syncSpecFile.link);

  return fs.readFile(filePath, 'utf8')
    .then((fileStr: string) => {

      const file: object = JSON.parse(fileStr);

      // I have commented out the following code to allow hacking of files -
      // that is, overwriting files in the pool without updating the sync spec with updated sha1
      // if (fileSize !== fileStr.length) {
      //   debugger;
      // }
      return Promise.resolve(file);
    });
}

function getFile(syncSpec: ArSyncSpec, fileName: string): ArSyncSpecDownload | null {

  let file: ArSyncSpecDownload | null = null;

  syncSpec.files.download.forEach((syncSpecFile: ArSyncSpecDownload) => {
    if (syncSpecFile.name === fileName) {
      file = syncSpecFile;
      return;
    }
  });

  return file;
}

function getSyncSpec(): Promise<any> {
  return getSyncSpecFilePath()
    .then((syncSpecFilePath: string | null) => {
      if (!syncSpecFilePath) {
        // TEDTODO - error object
        return Promise.reject('no sync spec found');
      }
      else {
        return Promise.resolve(readSyncSpec(syncSpecFilePath));
      }
    });
}

function readSyncSpec(syncSpecFilePath: string): Promise<ArSyncSpec> {

  return fs.readFile(syncSpecFilePath, 'utf8')
    .then((syncSpecStr: string) => {
      const syncSpec: ArSyncSpec = JSON.parse(syncSpecStr);
      return Promise.resolve(syncSpec);
    });
}

function getPoolAssetFiles(syncSpec: ArSyncSpec, pathToRoot: string): ArFileLUT {

  const poolAssetFiles: ArFileLUT = {};

  syncSpec.files.download.forEach((syncSpecFile: ArSyncSpecDownload) => {
    poolAssetFiles[syncSpecFile.name] = isomorphicPath.join(pathToRoot, syncSpecFile.link);
  });

  return poolAssetFiles;
}

function getSyncSpecFilePath(): Promise<string | null> {
  return getLocalSyncSpec()
    .then((localSyncSpecFilePath) => {
      if (isNil(localSyncSpecFilePath)) {
        return getNetworkedSyncSpec();
      }
      else {
        return Promise.resolve(localSyncSpecFilePath);
      }
    });
}

function getNetworkedSyncSpec(): Promise<string | null> {
  const filePath: string = getNetworkedSyncSpecFilePath();
  return fs.pathExists(filePath)
    .then((exists: boolean) => {
      if (exists) {
        return Promise.resolve(filePath);
      }
      else {
        return Promise.resolve(null);
      }
    });
}

function getLocalSyncSpec(): Promise<string | null> {
  const filePath: string = getLocalSyncSpecFilePath();
  return fs.pathExists(filePath)
    .then((exists: boolean) => {
      if (exists) {
        return Promise.resolve(filePath);
      }
      else {
        return Promise.resolve(null);
      }
    });
}

function getLocalSyncSpecFilePath(): string {
  // return isomorphicPath.join(PlatformService.default.getRootDirectory(), 'local-sync.json');
  const rootDirectory: string = getRootDirectory();
  const syncSpecFilePath = isomorphicPath.join(rootDirectory, 'local-sync.json');
  // return isomorphicPath.join(getRootDirectory(), 'local-sync.json');
  return syncSpecFilePath;
}

function getNetworkedSyncSpecFilePath(): string {
  // return isomorphicPath.join(PlatformService.default.getRootDirectory(), 'current-sync.json');
  return isomorphicPath.join(getRootDirectory(), 'current-sync.json');
}

export function getPoolFilePath(fileName: string): string {
  const filePath: string = _poolAssetFiles[fileName];
  return filePath;
}

export function getPoolDirectory(): string {
  return isomorphicPath.join(getRootDirectory(), 'pool');
}

export function getFeedDirectory(): string {
  return isomorphicPath.join(getRootDirectory(), 'feedPool');
}

export function getRootDirectory(): string {
  return srcDirectory;
}

function restartPlayback(presentationName: string): Promise<void> {

  const rootPath = getRootDirectory();

  // TEDTODO - only a single scheduled item is currently supported
  const scheduledPresentation = _autoSchedule.scheduledPresentations[0];
  const presentationToSchedule = scheduledPresentation.presentationToSchedule;

  // TEDTODO - why does restartPlayback get a presentationName if it's also in the schedule?
  // for switchPresentations?
  presentationName = presentationToSchedule.name;

  const autoplayFileName = presentationName + '.bml';

  return getSyncSpecReferencedFile(autoplayFileName, _syncSpec, rootPath)
    .then((bpfxState: any) => {
      const autoPlay: any = bpfxState.bsdm;
      const signState = autoPlay as DmSignState;
      _autotronStore.dispatch(dmOpenSign(signState));

      // populate user variables from the sign.
      // set current values === default values for now
      const bsdm: DmState = _autotronStore.getState().bsdm;
      const userVariableIds: BsDmId[] = dmGetUserVariableIdsForSign(bsdm);
      for (const userVariableId of userVariableIds) {
        const userVariable = dmGetUserVariableById(bsdm, { id: userVariableId }) as DmcUserVariable;
        _autotronStore.dispatch(addUserVariable(userVariableId, userVariable.defaultValue));
      }

      return Promise.resolve();
    });
}

export function postMessage(event: ArEventType) {
  return ((dispatch: any) => {
    dispatch(queueHsmEvent(event));
  });
}

export function hsmInitialized(): boolean {

  if (!_playerHSM.initialized) {
    return false;
  }

  if (_hsmList.length === 0) {
    return false;
  }

  for (const hsm of _hsmList) {
    if (!hsm.initialized) {
      return false;
    }
  }

  return true;
}


export function queueHsmEvent(event: ArEventType) {
  return ((dispatch: any) => {
    if (event.EventType !== 'NOP') {
      _queuedEvents.push(event);
    }
    if (hsmInitialized()) {
      while (_queuedEvents.length > 0) {
        dispatch(dispatchHsmEvent(_queuedEvents[0]));
        _queuedEvents.shift();
      }
    }
  });
}

function dispatchHsmEvent(
  event: ArEventType
  // ): BsBrightSignPlayerModelThunkAction<undefined | void> {
): any {

  return ((dispatch: any) => {

    console.log('dispatchHsmEvent:');
    console.log(event.EventType);

    let action = _playerHSM.hsmDispatch(event).bind(_playerHSM);
    dispatch(action);

    _hsmList.forEach((hsm) => {
      action = hsm.hsmDispatch(event).bind(hsm);
      dispatch(action);
    });
  });
}


function startPlayback() {

  return (dispatch: any, getState: any) => {

    const bsdm: DmState = getState().bsdm;

    const zoneHSMs: ZoneHSM[] = [];
    const zoneIds: BsDmId[] = dmGetZonesForSign(bsdm);
    zoneIds.forEach((zoneId: BsDmId) => {
      const bsdmZone: DmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

      let zoneHSM: ZoneHSM;

      switch (bsdmZone.type) {
        case ZoneType.Ticker: {
          zoneHSM = new TickerZoneHSM(zoneId + '-' + bsdmZone.type, zoneId, queueHsmEvent, bsdm);
          break;
        }
        default: {
          zoneHSM = new MediaZoneHSM(zoneId + '-' + bsdmZone.type, zoneId, queueHsmEvent, bsdm);
          break;
        }
      }
      zoneHSMs.push(zoneHSM);
      _hsmList.push(zoneHSM);
    });

    const promises: any[] = [];

    zoneHSMs.forEach((zoneHSM: ZoneHSM) => {
      zoneHSM.constructorFunction();
      const action = zoneHSM.hsmInitialize().bind(zoneHSM);
      promises.push(dispatch(action));
    });

    Promise.all(promises).then(() => {
      const hsmInitializationComplete = hsmInitialized();
      if (hsmInitializationComplete) {
        const event: ArEventType = {
          EventType: 'NOP',
        };
        dispatch(queueHsmEvent(event));
      }
    });
  };
}

