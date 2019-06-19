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
  initializeBrightSign
} from '../platform/brightSign';

// const platform: string = 'Desktop';
const platform: string = 'BrightSign';

let srcDirectory = '';
if (platform === 'Desktop') {
  srcDirectory = '/Users/tedshaffer/Desktop/ad';
}
else {
  const process = require('process');
  process.chdir('/storage/sd');
  srcDirectory = '';
}

import Registry from '@brightsign/registry';
import { EventType } from '@brightsign/bscore';
const registry: Registry = new Registry();
registry.read('networking', 'ru')
  .then((keyValue) => {
  });

declare class BSControlPort {
  constructor(portName: string);
}

function getControlPort(portName: string): any {
  return new Promise((resolve: any) => {
    let controlPort: any = null;
    try {
      controlPort = new BSControlPort(portName);
    }
    catch (e) {
      console.log('failed to create controlPort: ');
      console.log(portName);
    }
    resolve(controlPort);
  });
}

if (platform === 'BrightSign') {

  initializeBrightSign();

  // const bp900Setup = new BSControlPort('TouchBoard-0-LED-SETUP') as any;
  // bp900Setup.SetPinValue(0, 11);

  // const bp900 = new BSControlPort('TouchBoard-0-LED') as any;
  // bp900.SetPinValue(0, 0x07fe)
  // bp900.SetPinValue(1, 0x07fd)
  // bp900.SetPinValue(2, 0x07fb)
  // bp900.SetPinValue(3, 0x07f7)
  // bp900.SetPinValue(4, 0x07ef)
  // bp900.SetPinValue(5, 0x07df)
  // bp900.SetPinValue(6, 0x07bf)
  // bp900.SetPinValue(7, 0x077f)
  // bp900.SetPinValue(8, 0x06ff)
  // bp900.SetPinValue(9, 0x05ff)
  // bp900.SetPinValue(10, 0x03ff)

  // bp900.SetPinValue(0, 0x038e38c);
  // bp900.SetPinValue(1, 0x038e38c);
  // bp900.SetPinValue(2, 0x038e38c);
  // bp900.SetPinValue(3, 0x038e38c);
  // bp900.SetPinValue(4, 0x038e38c);
  // bp900.SetPinValue(5, 0x038e38c);
  // bp900.SetPinValue(6, 0x038e38c);
  // bp900.SetPinValue(7, 0x038e38c);
  // bp900.SetPinValue(8, 0x038e38c);
  // bp900.SetPinValue(9, 0x038e38c);
  // bp900.SetPinValue(10, 0x038e38c);

  // // const getGpioControlPortPromise: Promise<any> = getControlPort('BrightSign');
  const getBP900ControlPort0Promise: Promise<any> = getControlPort('TouchBoard-0-GPIO');

  getBP900ControlPort0Promise
    .then((controlPort) => {
      console.log('bp900ControlPort created');

      controlPort.oncontroldown = function (e: any) {
        console.log('### oncontroldown ' + e.code);
        const newtext = ' DOWN: ' + e.code + '\n';
        console.log(newtext);

        const event: ArEventType = {
          EventType: EventType.Bp,
          EventData: {
            bpIndex: 'a',
            bpType: 'bp900',
            buttonNumber: Number(e.code),
          }
        };

        console.log('********------- dispatch bp event');

        const reduxStore: any = getReduxStore();
        reduxStore.dispatch(dispatchHsmEvent(event));
      };
    })
    .catch((err) => {
      console.log(err);
    });

  // let bp900LEDControlPort: any;
  // const getBP900LEDSetupPortPromise: Promise<any> = getControlPort('TouchBoard-0-LED-SETUP');
  // const getBP900LEDControlPortPromise: Promise<any> = getControlPort('TouchBoard-0-LED');

  // getBP900LEDSetupPortPromise
  //   .then((ledSetupPort) => {
  //     console.log('led setup port created');
  //     ledSetupPort.SetOutputValue(0, 22);
  //     ledSetupPort.SetOutputValue(1, 0);
  //     ledSetupPort.SetOutputValue(2, 0);

  //     getBP900LEDControlPortPromise
  //       .then((ledControlPort) => {
  //         bp900LEDControlPort = ledControlPort;

  //         ledSetupPort.SetOutputValue(0, 0x000B00A0)
  //         // m.bpOutput[buttonPanelIndex%].SetOutputValue(i%, &h038e38c)
  //         bp900LEDControlPort.SetOutputValue(0, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(1, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(2, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(3, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(4, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(5, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(6, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(7, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(8, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(9, 0x038e38c)
  //         bp900LEDControlPort.SetOutputValue(10, 0x038e38c)

  //         // ledSetupPort.SetOutputValue(0, 0x000B00A0)
  //         // bp900LEDControlPort.SetOutputValue(0, 0x07fe)
  //         // bp900LEDControlPort.SetOutputValue(1, 0x07fd)
  //         // bp900LEDControlPort.SetOutputValue(2, 0x07fb)
  //         // bp900LEDControlPort.SetOutputValue(3, 0x07f7)
  //         // bp900LEDControlPort.SetOutputValue(4, 0x07ef)
  //         // bp900LEDControlPort.SetOutputValue(5, 0x07df)
  //         // bp900LEDControlPort.SetOutputValue(6, 0x07bf)
  //         // bp900LEDControlPort.SetOutputValue(7, 0x077f)
  //         // bp900LEDControlPort.SetOutputValue(8, 0x06ff)
  //         // bp900LEDControlPort.SetOutputValue(9, 0x05ff)
  //         // bp900LEDControlPort.SetOutputValue(10, 0x03ff)

  //         // console.log('led control port created');
  //         // bp900LEDControlPort = ledControlPort;
  //         // bp900LEDControlPort.SetOutputValue(0, 1)
  //         // bp900LEDControlPort.SetOutputValue(1, 1)
  //         // bp900LEDControlPort.SetOutputValue(2, 1)
  //         // bp900LEDControlPort.SetOutputValue(3, 1)
  //         // bp900LEDControlPort.SetOutputValue(4, 1)
  //         // bp900LEDControlPort.SetOutputValue(5, 1)
  //         // bp900LEDControlPort.SetOutputValue(6, 1)
  //         // bp900LEDControlPort.SetOutputValue(7, 1)
  //         // bp900LEDControlPort.SetOutputValue(8, 1)
  //         // bp900LEDControlPort.SetOutputValue(9, 1)
  //         // bp900LEDControlPort.SetOutputValue(10, 1)
  //       })
  //       .catch((err) => {
  //         console.log(err);
  //       });

  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });

  // end of for BrightSign only
}

let _autotronStore: Store<BsBrightSignPlayerState>;
let _syncSpec: ArSyncSpec;
let _poolAssetFiles: ArFileLUT;
let _autoSchedule: any;

let _hsmList: HSM[] = [];
let _playerHSM: PlayerHSM;



// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------
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
    _playerHSM = new PlayerHSM('playerHSM', startPlayback, restartPlayback, postMessage, dispatchHsmEvent);
    dispatch(_playerHSM.initialize());
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

// function getPoolDirectory(): string {
//   return isomorphicPath.join(getRootDirectory(), 'pool');
// }

function getRootDirectory(): string {
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
    dispatch(dispatchHsmEvent(event));
  });
}


export function dispatchHsmEvent(
  event: ArEventType
): BsBrightSignPlayerModelThunkAction<undefined | void> {

  return ((dispatch: any) => {
    dispatch(_playerHSM.Dispatch(event));

    _hsmList.forEach((hsm) => {
      dispatch(hsm.Dispatch(event));
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
        default: {
          zoneHSM = new MediaZoneHSM(zoneId + '-' + bsdmZone.type, zoneId, dispatchHsmEvent, bsdm);
          break;
        }
      }
      zoneHSMs.push(zoneHSM);
      _hsmList.push(zoneHSM);
    });

    zoneHSMs.forEach((zoneHSM: ZoneHSM) => {
      zoneHSM.constructorFunction();
      dispatch(zoneHSM.initialize());
    });
  };
}


