// client/src/components/common/ErrorBoundary.jsx
import { Component } from 'react';
import { Alert, Button, Container } from 'react-bootstrap';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Không thể hiển thị trang</Alert.Heading>
          <p>Vui lòng tải lại trang để thử lại.</p>
          {this.state.error && (
            <pre className="mt-3 p-3 bg-light text-dark rounded border small text-start overflow-auto" style={{ maxHeight: '200px' }}>
              {this.state.error.message || String(this.state.error)}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
          <Button variant="outline-danger" onClick={() => window.location.reload()}>Tải lại trang</Button>
        </Alert>
      </Container>
    );
  }
}
