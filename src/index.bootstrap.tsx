import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import './asset/bootstrap.css';
import 'normalize.css/normalize.css';
import 'flexboxgrid/dist/flexboxgrid.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { App, bsBrightSignPlayerReducer, BsBrightSignPlayerState } from './index';
import { initRuntime } from './controller';
import { combineReducers } from 'redux';
import { bsDmReducer } from '@brightsign/bsdatamodel';
// import express from 'express';
import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';
import { getRootDirectory, getPoolDirectory } from './controller/runtime';

import { FileToPublish, ContentFileMap, FilesToPublishMap } from './type';
import { SyncSpecDownload, SyncSpec, SyncSpecFiles } from './type';
import { isNil } from 'lodash';

const getStore = () => {
  const reducers = combineReducers<BsBrightSignPlayerState>({
    bsdm: bsDmReducer,
    bsPlayer: bsBrightSignPlayerReducer,
  });
  return createStore<BsBrightSignPlayerState>(
    reducers,
    composeWithDevTools(applyMiddleware(thunk),
    ));
};

function bootstrapper() {

  console.log('bootstrapper');

  const store = getStore();

  store.dispatch(initRuntime(store));

  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById('root') as HTMLElement
  );

}

// LFN
// endpoints
/*
const deviceStatusApiPath = '/v2/device/status';
POST: const snapshotConfigurationApiPath = '/v2/snapshot/configuration';
const snapshotHistoryApiPath = '/v2/snapshot/history';
const snapshotApiPath = '/v2/snapshot';
-1: GET:  const deviceConfigurationApiPath = '/v2/device/configuration';
0:  POST: const storageConfigurationApiPath = '/v2/storage/configuration';
1:  POST: const publishApiPath = '/v2/publish';
1.5 POST: const publishFileApiPath = '/v2/publish/file';
2:  POST: const publishSyncApiPath = '/v2/publish/sync';
*/


function handleStatus(req: any, res: any) {
  res.send('status');
}

// first request from autorun.
function handleConfiguration(req: any, res: any) {

  const respBody = {
    model: 'XT1144',
    family: 'malibu',
    unitName: 'fred',
    contentPort: '8008'
  };

  res.json(respBody);
}

function handleStorageConfiguration(req: any, res: any) {
  const limitStorageEnabled: boolean = req.body.limitStorageEnabled;
  res.status(200).end();
}

// PostPrepareForTransferJson
// '/v2/publish'
function handlePublish(req: any, res: any) {

  const buffer: any = req.files[0].buffer;
  const fileSpecs: FileToPublish[] = JSON.parse(buffer).file;

  const response: any = getFilesToPublishResponse(fileSpecs);
  res.json(response);
}

// PostFileJson
// /v2/publish/file
function handlePublishFile(req: any, res: any) {

  const fileToTransfer: any = req.files[0];
  const { destination, encoding, fieldname, filename, mimetype, originalname, path, size } = fileToTransfer;
  const sha1FileName = req.headers['destination-filename'];

  const sourcePath: string = isomorphicPath.join(getRootDirectory(), 'lfnTransfers') + '/' + filename;

  const poolDirectory = getPoolDirectory();
  const fileNameLength = sha1FileName.length;
  const firstDir: string = sha1FileName.substring(fileNameLength - 2, fileNameLength - 1);
  const secondDir: string = sha1FileName.substring(fileNameLength - 1, fileNameLength);
  const destinationDirectory = isomorphicPath.join(poolDirectory, firstDir, secondDir);
  fs.ensureDirSync(destinationDirectory);
  const destinationPath = destinationDirectory + '/' + sha1FileName.substring(5);

  fs.renameSync(sourcePath, destinationPath);

  res.status(200).end();
}

// PostSyncSpecJson
// /v2/publish/sync
function handlePublishSync(req: any, res: any) {

  console.log('------------------------------------------------------------------- handlePublishFile');
  // const xferFile: any = req.files[0];
  // const { destination, encoding, fieldname, filename, mimetype, originalname, path, size } = xferFile;
  // const newSyncFileName = req.headers['destination-filename'];
  // const newSyncSpecPath: string = isomorphicPath.join(getRootDirectory(), 'syncSpec') + '/' + newSyncFileName;
  const newSyncSpecPath = req.files[0].path;
  const newSyncSpecBuffer: Buffer = fs.readFileSync(newSyncSpecPath);
  const newSyncSpecStr = newSyncSpecBuffer.toString();
  const newSyncSpec: SyncSpec = JSON.parse(newSyncSpecStr) as SyncSpec;
  console.log(newSyncSpec);

  const oldSyncFileName = 'local-sync.json';
  const oldSyncSpecPath = isomorphicPath.join(getRootDirectory(), oldSyncFileName);
  const oldSyncSpecBuffer: Buffer = fs.readFileSync(oldSyncSpecPath);
  const oldSyncSpecStr = oldSyncSpecBuffer.toString();
  const oldSyncSpec: any = JSON.parse(oldSyncSpecStr);
  console.log(oldSyncSpec);

  const oldSyncSpecScriptsOnly: SyncSpecDownload[] = [];
  const oldSyncSpecFiles: SyncSpecFiles = newSyncSpec.files;
  const oldSyncSpecDownloadFiles: SyncSpecDownload[] = oldSyncSpecFiles.download;
  for (const syncSpecDownload of oldSyncSpecDownloadFiles) {
    if (!isNil(syncSpecDownload.group) && syncSpecDownload.group === 'script') {
      oldSyncSpecScriptsOnly.push(syncSpecDownload);
    }
  } 

  const newSyncSpecScriptsOnly: SyncSpecDownload[] = [];
  const newSyncSpecFiles: SyncSpecFiles = newSyncSpec.files;
  const newSyncSpecDownloadFiles: SyncSpecDownload[] = newSyncSpecFiles.download;
  for (const syncSpecDownload of newSyncSpecDownloadFiles) {
    if (!isNil(syncSpecDownload.group) && syncSpecDownload.group === 'script') {
      newSyncSpecScriptsOnly.push(syncSpecDownload);
    }
  } 


  fs.writeFileSync(oldSyncSpecPath, newSyncSpecStr);
  
  res.send('handlePublishSync');
}







const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer();

// with this syntax, the file is uploaded to uploads/
// const uploadManifest = multer({ dest: 'uploads/' })

// with this syntax, the file information is available via req.files. included is a buffer with the content of the upload
const uploadManifest = multer();

const uploadLfnTransfers = multer({ dest: 'lfnTransfers/' });
const uploadLfnSyncSpec = multer({ dest: 'syncSpec/' });

const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(req, res));

app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(req, res));
app.post('/v2/storage/configuration', upload.none(), (req: any, res: any, next: any) => handleStorageConfiguration(req, res));

// app.post('/v2/publish', uploadManifest.single('filesToPublish.json'), (req: any, res: any) => handlePublish(req, res));
// This approach works for the method I want; unable to get .single() to work.
app.post('/v2/publish', uploadManifest.any(), (req: any, res: any) => handlePublish(req, res));

app.post('/v2/publish/file', uploadLfnTransfers.any(), (req: any, res: any) => handlePublishFile(req, res));

app.post('/v2/publish/sync', uploadLfnSyncSpec.any(), (req: any, res: any) => handlePublishSync(req, res));


app.listen(port, () => console.log(`Example app listening on port ${port}!`));

// setTimeout(bootstrapper, 30000);
setTimeout(bootstrapper, 1000);

function getFilesToPublishResponse(filesInPublish: FileToPublish[]): any {

  const filesToPublish: FilesToPublishMap = getFilesToPublish(filesInPublish);

  const resp: any = {};
  resp.family = 'malibu';
  resp.model = 'xt1144';
  resp.fwVersion = '8.0.69.2';
  resp.fwVersionNumber = '1776';

  resp.file = [];

  for (const fileName in filesToPublish) {
    if (filesToPublish.hasOwnProperty(fileName)) {
      const fileToPublish: FileToPublish = filesToPublish[fileName];
      const file: any = {
        fileName: fileToPublish.fileName,
        filePath: fileToPublish.filePath,
        hash: fileToPublish.hash,
        size: fileToPublish.size
      };
      resp.file.push(file);
    }
  }
  return resp;
}

function getFilesToPublish(filesToPublish: FileToPublish[]): FilesToPublishMap {

  // files that need to be copied by BrightAuthor
  const actualPublishFiles: FilesToPublishMap = {};

  // files that can be deleted to make room for more content
  const deletionCandidates = {};

  const currentPoolFiles: ContentFileMap = getContentFiles();
  for (const currentPoolFile in currentPoolFiles) {
    if (currentPoolFiles.hasOwnProperty(currentPoolFile)) {
      deletionCandidates[currentPoolFile] = currentPoolFiles[currentPoolFile];
    }
  }

  for (const fileToPublish of filesToPublish) {
    if (!deletionCandidates.hasOwnProperty(fileToPublish.poolFileName)) {
      actualPublishFiles[fileToPublish.fileName] = fileToPublish;
    }
  }

  return actualPublishFiles;
}

function getContentFiles(): ContentFileMap {

  const allFiles: ContentFileMap = {};

  const poolDirectoryPath = getPoolDirectory();

  const firstLevelPoolDirectories: string[] = fs.readdirSync(poolDirectoryPath);

  for (const firstLevelPoolDirectory of firstLevelPoolDirectories) {
    const firstLevelPoolDirectoryPath = isomorphicPath.join(poolDirectoryPath, firstLevelPoolDirectory);
    const secondLevelPoolDirectories: string[] = fs.readdirSync(firstLevelPoolDirectoryPath);
    for (const secondLevelPoolDirectory of secondLevelPoolDirectories) {
      const secondLevelPoolDirectoryPath = isomorphicPath.join(firstLevelPoolDirectoryPath, secondLevelPoolDirectory);
      const filesInDirectory: string[] = fs.readdirSync(secondLevelPoolDirectoryPath);
      for (const fileInDirectory of filesInDirectory) {
        allFiles[fileInDirectory] = secondLevelPoolDirectoryPath;
      }
    }
  }

  return allFiles;
}


