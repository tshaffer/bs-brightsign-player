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

function handleStatus(res: any) {
  console.log('send status');
  res.send('status');
}

function handleConfiguration(res: any) {
  console.log('send configuration');
  res.send('configuration');
}

function handleStorageConfiguration(res: any) {
  res.send('handleStorageConfiguration');
}

function handlePublish(res: any) {
  res.send('handlePublish');
}

function handlePublishSync(res: any) {
  res.send('handlePublishSync');
}

// const app: express.Application = express();
// console.log(app);
const express = require('express');
const app = express();
const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(res));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(res));
app.post('/v2/storage/configuration',  (req: any, res: any) => handleStorageConfiguration(res));
app.post('/v2/publish',  (req: any, res: any) => handlePublish(res));
app.post('/v2/publish/sync',  (req: any, res: any) => handlePublishSync(res));


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