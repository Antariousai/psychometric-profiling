import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { T } from '../constants/tokens';

export default class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.warn('[RootErrorBoundary]', error?.message || error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.cream,
          padding: 28,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Text style={{ fontFamily: T.fBnBlack, fontSize: 20, color: T.ink, textAlign: 'center' }}>
          অ্যাপ লোডে সমস্যা
        </Text>
        <Text style={{ fontFamily: T.fMono, fontSize: 10, color: T.ink3, textAlign: 'center', lineHeight: 17 }}>
          Something went wrong rendering this screen. Try closing and reopening the app.
        </Text>
        <Pressable
          onPress={() => this.setState({ hasError: false, error: null })}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 24,
            backgroundColor: T.navy,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontFamily: T.fBnBold, fontSize: 14, color: '#fff' }}>পুনরায় চেষ্টা করুন</Text>
        </Pressable>
      </View>
    );
  }
}
