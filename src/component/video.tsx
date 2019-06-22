import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { bindActionCreators } from 'redux';
import { postVideoEnd } from '../controller/device/player';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface VideoProps {
  width: number;
  height: number;
  onVideoEnd: () => void;
  onVideoRefRetrieved: (videoElementRef: any) => void;
  src: string;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export class VideoComponent extends React.Component<VideoProps> {

  videoElementRef: any;

  onVideoRefRetrieved(videoElementRef: any) {
    this.videoElementRef = videoElementRef;
    this.props.onVideoRefRetrieved(videoElementRef);
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
        ref={(videoElementRef) => {
          console.log('videoElementRef retrieved');
          self.onVideoRefRetrieved(videoElementRef);
        }}
        onEnded={() => {
          console.log('**** - videoEnd');
          self.props.onVideoEnd();
        }} 
      />
    );
  }
}

// -----------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
  return bindActionCreators({
    onVideoEnd: postVideoEnd,
  }, dispatch);
};

const mapStateToProps = (state: any, ownProps: any): any => {
  return {
    src: ownProps.src,
    width: ownProps.width,
    height: ownProps.height,
  };
};

export const Video = connect(mapStateToProps, mapDispatchToProps)(VideoComponent);

