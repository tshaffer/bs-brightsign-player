import * as React from 'react';

import {
  DmState,
  DmcZone,
  dmGetZoneById,
  dmGetZonesForSign,
} from '@brightsign/bsdatamodel';

import { MediaZone } from './mediaZone';
import { connect } from 'react-redux';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/** @internal */
export interface SignProps {
  bsdm: DmState;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export class SignComponent extends React.Component<SignProps> {

  getMediaZoneJSX(zone: DmcZone): object {

    return (
      <div
        key={zone.id}
        style={{
          position: 'absolute',
          left: zone.absolutePosition.x,
          top: zone.absolutePosition.y,
          width: zone.absolutePosition.width,
          height: zone.absolutePosition.height,
        }}
      >
        <MediaZone
          key={zone.id}
          bsdm={this.props.bsdm}
          zone={zone}
          width={Number(zone.absolutePosition.width)}
          height={Number(zone.absolutePosition.height)}
          activeMediaStateId={''}
        />
      </div>
    );
  }

  getZoneJSX(zoneId: string): object | null {

    const zone: DmcZone = dmGetZoneById(this.props.bsdm, { id: zoneId }) as DmcZone;

    switch (zone.type) {
      case 'VideoOrImages': {
        return this.getMediaZoneJSX(zone);
      }
      default: {
        debugger;
      }
    }

    return null;
  }

  render() {

    const zoneIds: string[] = dmGetZonesForSign(this.props.bsdm);

    return (
      <div>
        {
          zoneIds.map((zoneId) =>
            this.getZoneJSX(zoneId),
          )
        }
      </div>
    );
  }
}

// -----------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------

// const mapDispatchToProps = (dispatch: Dispatch<any>) => {
//   return bindActionCreators({
//   }, dispatch);
// };

// const mapStateToProps = (state: any, ownProps: undefined): Partial<ImageProps> => {
// const mapStateToProps = (state: any, ownProps: undefined): ImageProps => {
const mapStateToProps = (state: any, ownProps: undefined): any => {
  return {
    src: state.src,
    width: state.width,
    height: state.height,
  };
};

// export const Image = connect(mapStateToProps, mapDispatchToProps)(ImageComponent);
export const Sign = connect(mapStateToProps)(SignComponent);
