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
import { App, bsBspReducer, BsBrightSignPlayerState } from './index';
import { initRuntime } from './controller';
import { combineReducers } from 'redux';
import { bsDmReducer } from '@brightsign/bsdatamodel';

console.log('index.bootstrap.tsx: start');

const getStore = () => {
  const reducers = combineReducers<BsBrightSignPlayerState>({
    bsdm: bsDmReducer,
    bsplayer: bsBspReducer,
  });
  return createStore<BsBrightSignPlayerState>(
    reducers,
    composeWithDevTools(applyMiddleware(thunk),
  ));
};

const store = getStore();

store.dispatch(initRuntime(store));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
