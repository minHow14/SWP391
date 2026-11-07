// D:/SWP391/SWP391/client/src/routes/AppRoutes.jsx

import { lazy, Suspense } from 'react';
import { Spinner } from 'react-bootstrap';
import { Routes, Route, Navigate } from 'react-router';
import SiteLayout from '../components/layout/SiteLayout.jsx';

const Home = lazy(() => import('../pages/Home.jsx'));
const Login = lazy(() => import('../pages/auth/Login.jsx'));
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const Recipes = lazy(() => import('../pages/Recipes.jsx'));
const Community = lazy(() => import('../pages/Community.jsx'));
const FoodScanner = lazy(() => import('../pages/FoodScanner.jsx'));
const FoodSwap = lazy(() => import('../pages/FoodSwap.jsx'));
const IngredientDictionary = lazy(() => import('../pages/IngredientDictionary.jsx'));
const Restaurants = lazy(() => import('../pages/Restaurants.jsx'));
const Journal = lazy(() => import('../pages/Journal.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
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
                    <Route path="/cong-thuc" element={<Recipes />} />
                    <Route path="/cong-dong" element={<Community />} />
                </Route>} />} />
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/admin/ai" element={<Navigate to="/admin?tab=ai-management" replace />} />
                <Route path="/dang-nhap" element={<Login />} />
                <Route path="/dang-ky" element={<Register />} />
                <Route path="/quen-mat-khau" element={<ForgotPassword />} />
                <Route path="/dat-lai-mat-khau" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
