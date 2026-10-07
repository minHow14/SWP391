import { Routes, Route, Navigate } from 'react-router';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import Recipes from './pages/Recipes.jsx';
import Community from './pages/Community.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/cong-thuc" element={<Recipes />} />
        <Route path="/cong-dong" element={<Community />} />
      </Route>
      <Route path="/dang-nhap" element={<Login />} />
      <Route path="/dang-ky" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
