import { Routes, Route, Navigate } from 'react-router';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import Recipes from './pages/Recipes.jsx';
import Community from './pages/Community.jsx';
import FoodScanner from './pages/FoodScanner.jsx';
import FoodSwap from './pages/FoodSwap.jsx';
import IngredientDictionary from './pages/IngredientDictionary.jsx';
import Restaurants from './pages/Restaurants.jsx';
import Journal from './pages/Journal.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
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
      </Route>
      <Route path="/dang-nhap" element={<Login />} />
      <Route path="/dang-ky" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
