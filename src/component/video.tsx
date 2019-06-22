import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { bindActionCreators } from 'redux';
import { postVideoEnd } from '../controller/device/player';

// const getSourceContainerStyle = () => style({
//   height: '150px',
//   width: 'calc(100% - 24px)',
//   margin: '12px 12px 12px 12px',
//   position: 'relative',
//   textAlign: 'center',
//   backgroundColor: '#FFFFFF'
// });


// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface VideoProps {
  width: number;
  height: number;
  onVideoEnd: () => void;
  onVideoRefRetrieved: (videoElementRef: any) => void;
  onVideoElementSourceRetrieved: (videoElementSourceRef: any) => void;
  src: string;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export class VideoComponent extends React.Component<VideoProps> {

  videoElementRef: any;
  videoElementSourceRef: any;

  onVideoRefRetrieved(videoElementRef: any) {
    this.videoElementRef = videoElementRef;
    this.props.onVideoRefRetrieved(videoElementRef);
  }

  onVideoElementSourceRetrieved(videoElementSourceRef: any) {
    this.videoElementSourceRef = videoElementSourceRef;
    this.props.onVideoElementSourceRetrieved(videoElementSourceRef);
  }

  render() {

    console.log('video: render');
    console.log(this.props.src);

    const self = this;

    // type="video/mp4"
    return (
      <video
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
      >
        <source
          src={this.props.src}
          ref={(videoElementSource) => {
            console.log('videoElementSource retrieved');
            self.onVideoElementSourceRetrieved(videoElementSource);
          }}
        />
      </video>
    );
  }
}

/*
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
*/

/*
        <source
          src={this.props.src}
          ref={(videoElementSource) => {
            console.log('videoElementSource retrieved');
            self.onVideoElementSourceRetrieved(videoElementSource);
          }}
        />
      </video>
*/

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

