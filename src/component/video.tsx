import * as React from 'react';
import { connect } from 'react-redux';
// import { Dispatch } from 'redux';
// import { bindActionCreators } from 'redux';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface VideoProps {
  width: number;
  height: number;
  onVideoEnd : () => void;
  src: string;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export class VideoComponent extends React.Component<VideoProps> {

  onVideoEnd() {
    console.log('onVideoEnd invoked');
    this.props.onVideoEnd();
  }

  render() {

    const self = this;

    // type="video/mp4"
    return (
      <video
        src={this.props.src}
        autoPlay={true}
        width={this.props.width.toString()}
        height={this.props.height.toString()}
        onEnded={() => {
          console.log('**** - videoEnd');
          self.onVideoEnd();
        }} 
      />
    );
  }
}

// -----------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------

// const mapDispatchToProps = (dispatch: Dispatch<any>) => {
//   return bindActionCreators({
//     onVideoEnd: videoEnded,
//   }, dispatch);
// };

const mapStateToProps = (state: any, ownProps: any): any => {
  return {
    src: ownProps.src,
    width: ownProps.width,
    height: ownProps.height,
  };
};

// export const Image = connect(mapStateToProps, mapDispatchToProps)(VideoComponent);
export const Video = connect(mapStateToProps)(VideoComponent);

