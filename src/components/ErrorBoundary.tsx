import React from 'react';
import { Text, View, Pressable } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    console.error('ErrorBoundary caught error:', error.message, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#C82829', marginBottom: 12 }}>页面加载出错</Text>
          <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            {'发生了未知错误'}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={{
              backgroundColor: '#C82829',
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>重试</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
