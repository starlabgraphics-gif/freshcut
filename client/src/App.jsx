import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store';
import AppLayout from './components/Layout';
import { BarberPoleLoader } from './components/ui';
import AuthPage from './pages/AuthPage';
import Explore from './pages/client/Explore';
import MyQueue from './pages/client/MyQueue';
import Visits from './pages/client/Visits';
import Console from './pages/barber/Console';
import ShopSettings from './pages/barber/ShopSettings';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

function RequireAuth({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="min-h-screen flex items-center justify-center"><BarberPoleLoader label="Sharpening the clippers" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function RoleOnly({ role, children }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to={user.role === 'barber' ? '/console' : '/explore'} replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'barber' ? '/console' : '/explore'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/explore" element={<RoleOnly role="client"><Explore /></RoleOnly>} />
          <Route path="/my-queue" element={<RoleOnly role="client"><MyQueue /></RoleOnly>} />
          <Route path="/visits" element={<RoleOnly role="client"><Visits /></RoleOnly>} />
          <Route path="/console" element={<RoleOnly role="barber"><Console /></RoleOnly>} />
          <Route path="/shop" element={<RoleOnly role="barber"><ShopSettings /></RoleOnly>} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
