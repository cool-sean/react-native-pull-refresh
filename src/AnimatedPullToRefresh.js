import React from 'react';
import { View, ScrollView, Animated, PanResponder, UIManager, Dimensions } from 'react-native';

import Animation from 'lottie-react-native';

class AnimatedPullToRefresh extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollY: new Animated.Value(0),
      refreshHeight: new Animated.Value(0),
      currentY: 0,
      isScrollFree: false,

      isRefreshAnimationStarted: false,
      isRefreshAnimationEnded: false,
      initAnimationProgress: new Animated.Value(0),
      repeatAnimationProgress: new Animated.Value(0),
      finalAnimationProgress: new Animated.Value(0),
    };

    this.onRepeatAnimation = this.onRepeatAnimation.bind(this);
    this.onEndAnimation = this.onEndAnimation.bind(this);

    UIManager.setLayoutAnimationEnabledExperimental &&
      UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder.bind(
        this,
      ),
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder.bind(
        this,
      ),
      onPanResponderMove: this._handlePanResponderMove.bind(this),
      onPanResponderRelease: this._handlePanResponderEnd.bind(this),
      onPanResponderTerminate: this._handlePanResponderEnd.bind(this),
    });
  }

  componentWillReceiveProps(props) {
    if (this.props.isRefreshing !== props.isRefreshing) {
      // Finish the animation and set refresh panel height to 0
      if (!props.isRefreshing) {
      }
    }
  }

  _handleStartShouldSetPanResponder(e, gestureState) {
    return !this.state.isScrollFree;
  }

  _handleMoveShouldSetPanResponder(e, gestureState) {
    return !this.state.isScrollFree;
  }

  // if the content scroll value is at 0, we allow for a pull to refresh
  _handlePanResponderMove(e, gestureState) {
    if (!this.props.isRefreshing) {
      if (
        (gestureState.dy >= 0 && this.state.scrollY._value === 0) ||
        this.state.refreshHeight._value > 0
      ) {
        this.state.refreshHeight.setValue(-1 * gestureState.dy * 0.5);
      } else {
        // Native android scrolling
        this.refs.scrollComponentRef.scrollTo({
          y: -1 * gestureState.dy,
          animated: true,
        });
      }
    }
  }

  _handlePanResponderEnd(e, gestureState) {
    if (!this.props.isRefreshing) {
        Animated.spring(this.state.refreshHeight, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

      if (this.state.scrollY._value > 0) {
        this.setState({isScrollFree: true});
      }
    }
  }

  onRepeatAnimation() {
    this.state.repeatAnimationProgress.setValue(0);

    Animated.timing(this.state.repeatAnimationProgress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      if (this.props.isRefreshing) {
        this.onRepeatAnimation();
      } else {
        this.state.repeatAnimationProgress.setValue(0);
        this.onEndAnimation();
      }
    });
  }

  onEndAnimation() {
    this.setState({isRefreshAnimationEnded: true});
    Animated.sequence([
      Animated.timing(this.state.finalAnimationProgress, {
        toValue: 1,
        useNativeDriver: true,
        duration: 1000,
      }),
      Animated.spring(this.state.refreshHeight, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 12,
      }),
    ]).start(() => {
      this.state.finalAnimationProgress.setValue(0);
      this.setState({
        isRefreshAnimationEnded: false,
        isRefreshAnimationStarted: false,
      });
    });
  }


  onScrollRelease() {
    if (!this.props.isRefreshing) {
      this.props.onRefresh();
    }
  }

  isScrolledToTop() {
    if (this.state.scrollY._value === 0 && this.state.isScrollFree) {
      this.setState({isScrollFree: false});
    }
  }

  render() {
    const onScrollEvent = event => {
      this.state.scrollY.setValue(event.nativeEvent.contentOffset.y);
    };

    const animateHeight = this.state.refreshHeight.interpolate({
      inputRange: [-this.props.pullHeight, 0],
      outputRange: [this.props.pullHeight, 0],
    });

    const animateProgress = this.state.refreshHeight.interpolate({
      inputRange: [-this.props.pullHeight, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const animationStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      left: 0,
      backgroundColor: this.props.animationBackgroundColor,
      width: Dimensions.get('window').width,
      height: this.props.pullHeight,
    };

    return (
      <View
        style={{flex: 1, backgroundColor: this.props.animationBackgroundColor}}
        {...this._panResponder.panHandlers}
        >
        <Animation
          style={[animationStyle, {opacity: this.props.isRefreshing ? 0 : 1}]}
          source={this.props.onPullAnimationSrc}
          progress={animateProgress}
        />
        <Animation
          style={[
            animationStyle,
            {
              opacity:
                this.props.isRefreshing && !this.state.isRefreshAnimationStarted
                  ? 1
                  : 0,
            },
          ]}
          source={this.props.onStartRefreshAnimationSrc}
          progress={this.state.initAnimationProgress}
        />
        <Animation
          style={[
            animationStyle,
            {
              opacity:
                this.state.isRefreshAnimationStarted &&
                !this.state.isRefreshAnimationEnded
                  ? 1
                  : 0,
            },
          ]}
          source={this.props.onRefreshAnimationSrc}
          progress={this.state.repeatAnimationProgress}
        />
        <Animation
          style={[
            animationStyle,
            {opacity: this.state.isRefreshAnimationEnded ? 1 : 0},
          ]}
          source={this.props.onEndRefreshAnimationSrc}
          progress={this.state.finalAnimationProgress}
        />

        <ScrollView
          ref="scrollComponentRef"
          scrollEnabled={this.state.isScrollFree}
          onScroll={onScrollEvent}
          onTouchEnd={() => {
            this.isScrolledToTop();
          }}
          onScrollEndDrag={() => {
            this.isScrolledToTop();
          }}>
          <Animated.View style={{translateY: animateHeight}}>
            {React.cloneElement(this.props.contentView, {
              scrollEnabled: false,
              ref: 'scrollComponentRef',
            })}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }
}

module.exports = AnimatedPullToRefresh;
