// client/src/App.jsx
// Component gốc: bọc toàn bộ hệ thống định tuyến trong ErrorBoundary để lỗi render không làm trắng trang.
import AppRoutes from './routes/AppRoutes.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

// Component App gốc của ứng dụng.
export default function App() {
  return <ErrorBoundary><AppRoutes /></ErrorBoundary>;
}
