// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/App.jsx
import AppRoutes from './routes/AppRoutes.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

export default function App() {
  return <ErrorBoundary><AppRoutes /></ErrorBoundary>;
}
