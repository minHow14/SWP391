// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/ErrorBoundary.jsx
import { Component } from 'react';
import { Alert, Button, Container } from 'react-bootstrap';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Không thể hiển thị trang</Alert.Heading>
          <p>Vui lòng tải lại trang để thử lại.</p>
          <Button variant="outline-danger" onClick={() => window.location.reload()}>Tải lại trang</Button>
        </Alert>
      </Container>
    );
  }
}
