import * as React from 'react';
import { isNil } from 'lodash';

// import { Dispatch } from 'redux';
// import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/** @internal */
export interface ImageProps {
  src: string;
  width: number;
  height: number;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export class ImageComponent extends React.Component<ImageProps> {
  render() {
    if (isNil(this.props.width)) {
      return (
        <img
          src={this.props.src}
        />
      );
    }
    else {
      return (
        <img
          src={this.props.src}
          width={this.props.width.toString()}
          height={this.props.height.toString()}
        />
      );
    }
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
const mapStateToProps = (state: any, ownProps: any): any => {
  return {
    src: ownProps.src,
    width: ownProps.width,
    height: ownProps.height,
  };
};

// export const Image = connect(mapStateToProps, mapDispatchToProps)(ImageComponent);
export const Image = connect(mapStateToProps)(ImageComponent);
