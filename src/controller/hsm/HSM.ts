import {
  ArEventType,
  HSMStateData,
} from '../../type/runtime';

import { isNil } from 'lodash';
import { setActiveHState, addHSM, BsBrightSignPlayerState } from '../../index';
import { ActionWithPayload } from '../../..';

export class HSM {

  hsmId: string;
  dispatchEvent: ((event: ArEventType) => void);
  topState: HState;
  activeState: HState | null;
  constructorHandler: (() => void) | null;
  initialPseudoStateHandler: () => (HState | null);

  constructor(hsmId: string, dispatchEvent: ((event: ArEventType) => void)) {
    this.hsmId = hsmId;
    this.dispatchEvent = dispatchEvent;
    this.activeState = null;
    this.constructorHandler = null;
  }

  constructorFunction() {
    if (!isNil(this.constructorHandler)) {
      this.constructorHandler();
    }
  }

  initialize() {

    let action: any;
    let status: string;

    return ((dispatch: any) => {

      dispatch(addHSM(this));

      const hStateAction: ActionWithPayload = setActiveHState(this.hsmId, null);
      dispatch(hStateAction);

      const stateData: HSMStateData = { nextState: null };

      // empty event used to get super states
      const emptyEvent: ArEventType = { EventType: 'EMPTY_SIGNAL' };

      // entry event
      const entryEvent: ArEventType = { EventType: 'ENTRY_SIGNAL' };

      // init event
      const initEvent: ArEventType = { EventType: 'INIT_SIGNAL' };

      // execute initial transition
      if (!isNil(this.initialPseudoStateHandler)) {
        action = (this.initialPseudoStateHandler() as any).bind(this);
        this.activeState = dispatch(action);
        // console.log(this.activeState);
      }

      // if there is no activeState, the playlist is empty
      if (isNil(this.activeState)) {
        dispatch(setActiveHState(this.hsmId, null));
        return;
      }

      if (!isNil(this.activeState)) {
        let activeState: HState = this.activeState;

        // start at the top state
        if (isNil(this.topState)) {
          // TODO
          debugger;
        }
        let sourceState = this.topState;

        while (true) {

          const entryStates = [];
          let entryStateIndex = 0;

          // target of the initial transition
          entryStates[0] = activeState;

          // send an empty event to get the super state
          action = (this.activeState).HStateEventHandler(emptyEvent, stateData).bind(this.activeState);          
          status = dispatch(action);

          activeState = stateData.nextState as HState;
          this.activeState = activeState;

          // walk up the tree until the current source state is hit
          while (activeState.id !== (sourceState).id) {
            entryStateIndex = entryStateIndex + 1;
            entryStates[entryStateIndex] = activeState;
            action = this.activeState.HStateEventHandler(emptyEvent, stateData).bind(this.activeState);
            status = dispatch(action);
            activeState = stateData.nextState as HState;
            this.activeState = activeState;
          }

          // restore the target of the initial transition
          // activeState = entryStates[0];

          // retrace the entry path in reverse (desired) order
          while (entryStateIndex >= 0) {
            const entryState = entryStates[entryStateIndex];
            action = entryState.HStateEventHandler(entryEvent, stateData).bind(entryState).bind(entryState);
            status = dispatch(action);
            entryStateIndex = entryStateIndex - 1;
          }

          // new source state is the current state
          sourceState = entryStates[0];

          // console.log('HSM.ts#initialize: invoke handler with initEvent');
          // console.log(sourceState.id);

          action = sourceState.HStateEventHandler(initEvent, stateData).bind(sourceState);
          status = dispatch(action);
          if (status !== 'TRANSITION') {
            this.activeState = sourceState;
            dispatch(setActiveHState(this.hsmId, this.activeState));
            return;
          }

          activeState = stateData.nextState as HState;
          this.activeState = activeState;
        }
      }
    });
  }

  // TEDTODO - remove casts
  Dispatch(event: ArEventType) {

    let action: any;
    let status: string;

    return ((dispatch: any, getState: () => BsBrightSignPlayerState) => {

      // console.log('HSM.ts#Dispatch');
      // console.log(event.EventType);

      // if there is no activeState, the playlist is empty
      if (this.activeState == null) {
        dispatch(setActiveHState(this.hsmId, this.activeState));
        return;
      }

      const stateData: HSMStateData = { nextState: null };

      // empty event used to get super states
      const emptyEvent: ArEventType = { EventType: 'EMPTY_SIGNAL' };

      // entry event
      const entryEvent: ArEventType = { EventType: 'ENTRY_SIGNAL' };

      // init event
      const initEvent: ArEventType = { EventType: 'INIT_SIGNAL' };

      // exit event
      const exitEvent: ArEventType = { EventType: 'EXIT_SIGNAL' };

      let t = this.activeState;                                                      // save the current state

      status = 'SUPER';
      let s: HState = this.activeState as HState; // TODO - initialized to reduce ts errors. TEDTODO - legit?
      while (status === 'SUPER') {                                                 // process the event hierarchically
        s = this.activeState as HState;
        action = s.HStateEventHandler(event, stateData).bind(s);
        status = dispatch(action);
        this.activeState = stateData.nextState;
      }

      if (status === 'TRANSITION') {
        const path = [];

        path[0] = this.activeState;                                                // save the target of the transition
        path[1] = t;                                                            // save the current state

        // exit from the current state to the transition s
        while (t.id !== s.id) {
          action = t.HStateEventHandler(exitEvent, stateData).bind(t);
          status = dispatch(action);
          if (status === 'HANDLED') {
            action = t.HStateEventHandler(emptyEvent, stateData).bind(t);
            status = dispatch(action);
          }
          t = stateData.nextState as HState;
        }

        t = path[0] as HState;                                                            // target of the transition

        // s is the source of the transition
        let ip: number = -1; // TEDTODO - initialization legit?
        // check source == target (transition to self)
        if (s.id === t.id) {
          action = s.HStateEventHandler(exitEvent, stateData).bind(s);                // exit the source
          status = dispatch(action);
          ip = 0;
        } else {
          action = t.HStateEventHandler(emptyEvent, stateData).bind(t);               // superstate of target
          status = dispatch(action);
          t = stateData.nextState as HState;
          if (s.id === t.id) {                                                 // check source == target->super
            ip = 0;                                                         // enter the target
          } else {
            action = s.HStateEventHandler(emptyEvent, stateData).bind(s);           // superstate of source
            status = dispatch(action);

            // check source->super == target->super
            if ((stateData.nextState as HState).id === t.id) {
              action = s.HStateEventHandler(exitEvent, stateData).bind(s);        // exit the source
              status = dispatch(action);
              ip = 0;                                                     // enter the target
            }
            else {
              if ((stateData.nextState as HState).id === (path as HState[])[0].id) {
                // check source->super == target
                action = s.HStateEventHandler(exitEvent, stateData).bind(s);    // exit the source
                status = dispatch(action);
              }
              // check rest of source == target->super->super and store the entry path along the way
              else {
                let iq = 0;                                             // indicate LCA not found
                ip = 1;                                                 // enter target and its superstate
                path[1] = t;                                            // save the superstate of the target
                t = stateData.nextState as HState;                                // save source->super
                // get target->super->super
                const aState: any = (path as HState[])[1];
                action = aState.HStateEventHandler(emptyEvent, stateData).bind(aState);
                status = dispatch(action);
                while (status === 'SUPER') {
                  ip = ip + 1;
                  path[ip] = stateData.nextState;                     // store the entry path
                  if ((stateData.nextState as HState).id === s.id) {                // is it the source?
                    iq = 1;                                         // indicate that LCA found
                    ip = ip - 1;                                    // do not enter the source
                    status = 'HANDLED';                             // terminate the loop
                  }
                  else {                                              // it is not the source; keep going up
                    const bState: any = (stateData.nextState as HState);
                    action = bState.HStateEventHandler(emptyEvent, stateData).bind(bState);
                    status = dispatch(action);
                  }
                }

                if (iq === 0) {                                           // LCA not found yet
                  action = s.HStateEventHandler(exitEvent, stateData).bind(s); // exit the source
                  status = dispatch(action);

                  // check the rest of source->super == target->super->super...
                  iq = ip;
                  status = 'IGNORED';                                 // indicate LCA not found
                  while (iq >= 0) {
                    if (t.id === (path as HState[])[iq].id) {                      // is this the LCA?
                      status = 'HANDLED';                         // indicate LCA found
                      ip = iq - 1;                                // do not enter LCA
                      iq = -1;                                    // terminate the loop
                    }
                    else {
                      iq = iq - 1;                                 // try lower superstate of target
                    }
                  }

                  if (status !== 'HANDLED') {                          // LCA not found yet?

                    // check each source->super->... for each target->super...
                    status = 'IGNORED';                             // keep looping
                    while (status !== 'HANDLED') {
                      action = t.HStateEventHandler(exitEvent, stateData).bind(t);
                      status = dispatch(action);
                      if (status === 'HANDLED') {
                        action = t.HStateEventHandler(emptyEvent, stateData).bind(t);
                        status = dispatch(action);
                      }
                      t = stateData.nextState as HState;                    // set to super of t
                      iq = ip;
                      while (iq > 0) {
                        if (t.id === (path as HState[])[iq].id) {              // is this the LCA?
                          ip = iq - 1;                        // do not enter LCA
                          iq = -1;                            // break inner
                          status = 'HANDLED';                 // break outer
                        }
                        else {
                          iq = iq - 1;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // retrace the entry path in reverse (desired) order...
        while (ip >= 0) {
          const cState: any = (path as HState[])[ip];
          action = cState.HStateEventHandler(entryEvent, stateData).bind(cState);        // enter path[ip]
          status = dispatch(action);
          ip = ip - 1;
        }

        // stick the target into register */
        t = (path as HState[])[0];
        this.activeState = t;                                                   // update the current state */

        // console.log('HSM.ts#Dispatch: invoke handler with initEvent');
        
        // drill into the target hierarchy...
        action = t.HStateEventHandler(initEvent, stateData).bind(t);
        status = dispatch(action);
        this.activeState = stateData.nextState;

        while (status === 'TRANSITION') {
          ip = 0;
          path[0] = this.activeState;
          action = (this.activeState as HState).HStateEventHandler(emptyEvent, stateData).bind(this.activeState); // find superstate
          status = dispatch(action);
          this.activeState = stateData.nextState;
          while ((this.activeState as HState).id !== t.id) {
            ip = ip + 1;
            path[ip] = this.activeState;
            action = (this.activeState as HState).HStateEventHandler(emptyEvent, stateData).bind(this.activeState); // find superstate
            status = dispatch(action);
            this.activeState = stateData.nextState;
          }
          this.activeState = path[0];

          while (ip >= 0) {
            const dState: any = (path as HState[])[ip];
            action = dState.HStateEventHandler(entryEvent, stateData).bind(dState);
            status = dispatch(action);
            ip = ip - 1;
          }

          t = (path as HState[])[0];

          action = t.HStateEventHandler(initEvent, stateData).bind(t);
          status = dispatch(action);
        }
      }

      // set the new state or restore the current state
      this.activeState = t;

      dispatch(setActiveHState(this.hsmId, this.activeState));

    });
  }
}

export class HState {

  topState: HState;
  HStateEventHandler: (event: ArEventType, stateData: HSMStateData) => any;
  stateMachine: HSM;
  superState: HState;
  id: string;

  constructor(stateMachine: HSM, id: string) {

    // filled in by HState instance
    // this.HStateEventHandler = null; TEDTODO - ts doesn't like this


    this.stateMachine = stateMachine;

    // filled in by HState instance
    // this.superState = null;  TEDTODO - ts doesn't like this
    this.id = id;
  }
}

export function STTopEventHandler(_: ArEventType, stateData: HSMStateData) {

  return ((dispatch: any) => {
    stateData.nextState = null;
    return 'IGNORED';
  });
}

