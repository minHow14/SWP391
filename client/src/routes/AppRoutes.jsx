// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/routes/AppRoutes.jsx
import { lazy, Suspense } from 'react';
import { Spinner } from 'react-bootstrap';
import { Routes, Route, Navigate } from 'react-router';
import SiteLayout from '../components/layout/SiteLayout.jsx';

const Home = lazy(() => import('../pages/Home.jsx'));
const Login = lazy(() => import('../pages/auth/Login.jsx'));
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const Recipes = lazy(() => import('../pages/Recipes.jsx'));
const Community = lazy(() => import('../pages/Community.jsx'));
const FoodScanner = lazy(() => import('../pages/FoodScanner.jsx'));
const FoodSwap = lazy(() => import('../pages/FoodSwap.jsx'));
const IngredientDictionary = lazy(() => import('../pages/IngredientDictionary.jsx'));
const Restaurants = lazy(() => import('../pages/Restaurants.jsx'));
const Journal = lazy(() => import('../pages/Journal.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
const AdminAi = lazy(() => import('../pages/admin/AdminAi.jsx'));
const AdminPortal = lazy(() => import('../pages/admin/AdminPortal.jsx'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center p-5" role="status"><Spinner animation="border" variant="success" /><span className="visually-hidden">Đang tải trang…</span></div>}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/kiem-tra-mon" element={<FoodScanner />} />
          <Route path="/doi-mon-chay" element={<FoodSwap />} />
          <Route path="/tu-dien-chay" element={<IngredientDictionary />} />
          <Route path="/quan-chay" element={<Restaurants />} />
          <Route path="/nhat-ky" element={<Journal />} />
          <Route path="/ho-so" element={<Profile />} />
          <Route path="/admin/ai" element={<AdminAi />} />
          <Route path="/cong-thuc" element={<Recipes />} />
          <Route path="/cong-dong" element={<Community />} />
        </Route>
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
