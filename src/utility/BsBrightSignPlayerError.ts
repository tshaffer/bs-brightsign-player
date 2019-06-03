export enum BsBrightSignPlayerErrorType {
  unknownError,
  unexpectedError,
  invalidParameters,
  invalidOperation,
  apiError,
  invalidModel,
}

const bsBrightSignPlayerErrorMessage: {[type: number]: string} = {
  [BsBrightSignPlayerErrorType.unknownError]: 'Unknown error',
  [BsBrightSignPlayerErrorType.unexpectedError]: 'Unexpected error',
  [BsBrightSignPlayerErrorType.invalidParameters]: 'Invalid parameters',
  [BsBrightSignPlayerErrorType.invalidOperation]: 'Invalid operation attempt',
  [BsBrightSignPlayerErrorType.apiError]: 'API error',
  [BsBrightSignPlayerErrorType.invalidModel]: 'Invalid model',
};

export class BsBrightSignPlayerError extends Error {
  name = 'BsBrightSignPlayerError';
  type: BsBrightSignPlayerErrorType;

  constructor(type: BsBrightSignPlayerErrorType, reason?: string) {
    super();
    this.type = type;
    if (reason) {
      this.message = bsBrightSignPlayerErrorMessage[type] + ': ' + reason;
    } else {
      this.message = bsBrightSignPlayerErrorMessage[type];
    }
    Object.setPrototypeOf(this, BsBrightSignPlayerError.prototype);
  }
}

export function isBsBrightSignPlayerError(error: Error): error is BsBrightSignPlayerError {
  return error instanceof BsBrightSignPlayerError;
}
