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

console.log('define getStore');

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

function handleStatus(req: any, res: any) {
  console.log('send status');
  res.send('status');
}

// first request from autorun.
function handleConfiguration(req: any, res: any) {
  console.log('---------------------------------------------- send configuration');

  const respBody = {
    model: 'XT1144',
    family: 'malibu',
    unitName: 'fred',
    contentPort: '8008'
  };

  res.json(respBody);
}

function handleStorageConfiguration(req: any, res: any) {
  console.log('---------------------------------------------- handleStorageConfiguration');
  const limitStorageEnabled: boolean = req.body.limitStorageEnabled;
  console.log('---------------------------------------------- limitStorageEnabled: ' + limitStorageEnabled);
  res.status(200).end();
}

// equivalent to
// PostPrepareForTransferJson
// '/v2/publish'
function handlePublish(req: any, res: any) {
  console.log('---------------------------------------------- handlePublish');
  console.log(req.files);

  const buffer: any = req.files[0].buffer;
  const fileSpecs: FileToPublish[] = JSON.parse(buffer).file;

  const response: any = getFilesToPublishResponse(fileSpecs);

  for (const fileSpec of fileSpecs) {
    console.log(fileSpec);
  }
  
  // files that need to be copied by BrightAuthor
  const actualPublishFiles = { }
  // files that can be deleted to make room for more content
  const deletionCandidates = { }

  if (fileSpecs.length > 0) {

  }

  res.status(200).end();
}

function handlePublishSync(req: any, res: any) {
  res.send('handlePublishSync');
}

const express = require('express');
const app = express();
const multer  = require('multer');
const upload = multer();

// with this syntax, the file is uploaded to uploads/
// const uploadManifest = multer({ dest: 'uploads/' })

// with this syntax, the file information is available via req.files. included is a buffer with the content of the upload
const uploadManifest = multer();

const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(req, res));

app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(req, res));
app.post('/v2/storage/configuration', upload.none(), (req: any, res: any, next: any) => handleStorageConfiguration(req, res));

// app.post('/v2/publish', uploadManifest.single('filesToPublish.json'), (req: any, res: any) => handlePublish(req, res));
// This approach works for the method I want; unable to get .single() to work.
app.post('/v2/publish', uploadManifest.any(), (req: any, res: any) => handlePublish(req, res));

// app.post('/v2/publish/sync',  (req: any, res: any) => handlePublishSync(req, res));


app.listen(port, () => console.log(`Example app listening on port ${port}!`));

console.log('setTimeout');

// setTimeout(bootstrapper, 30000);
setTimeout(bootstrapper, 1000);

// endpoints
/*
-1: const deviceConfigurationApiPath = '/v2/device/configuration';
const deviceStatusApiPath = '/v2/device/status';
POST: const snapshotConfigurationApiPath = '/v2/snapshot/configuration';
const snapshotHistoryApiPath = '/v2/snapshot/history';
const snapshotApiPath = '/v2/snapshot';
0: POST: const storageConfigurationApiPath = '/v2/storage/configuration';
1: POST: const publishApiPath = '/v2/publish';
POST: const publishFileApiPath = '/v2/publish/file';
2: POST: const publishSyncApiPath = '/v2/publish/sync';
*/

function getFilesToPublishResponse(filesInPublish: FileToPublish[]) {

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

  console.log('response:');
  console.log(resp);
  
  return resp;
}

function getFilesToPublish(filesToPublish: FileToPublish[]): FilesToPublishMap {

  // const filesToPublishPath = isomorphicPath.join(getRootDirectory(), 'filesToPublish.json');
  // const filesToPublishBuffer: Buffer = fs.readFileSync(filesToPublishPath);
  // const filesToPublishStr = filesToPublishBuffer.toString();
  // const filesToPublish: FileToPublish[] = JSON.parse(filesToPublishStr).file;
  // console.log(filesToPublish);

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
    if (!deletionCandidates.hasOwnProperty(fileToPublish.fileName)) {
      actualPublishFiles[fileToPublish.fileName] = fileToPublish;
    }
  }

  return actualPublishFiles;
}

function getContentFiles(): ContentFileMap {

  const allFiles: ContentFileMap = {};

  const poolDirectoryPath = getPoolDirectory();

  console.log('poolDirectory: ', poolDirectoryPath);

  const firstLevelPoolDirectories: string[] = fs.readdirSync(poolDirectoryPath);
  console.log(firstLevelPoolDirectories);

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

  console.log('allFiles:');
  console.log(allFiles);

  return allFiles;
}


