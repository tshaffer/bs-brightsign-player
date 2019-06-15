import { DmParameterizedString } from '@brightsign/bsdatamodel';

export interface UserVariable {
  userVariableId: string;
  currentValue: DmParameterizedString;
}

export interface UserVariableMap {
  [userVariableId: string]: UserVariable;
}
