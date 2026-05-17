'use client';
import * as Sentry from '@sentry/nextjs';
import { Component } from 'react';

export default class SentryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>
          <h2 style={{ marginBottom: 12 }}>Algo salió mal</h2>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
