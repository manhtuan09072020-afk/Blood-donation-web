import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ROLES, STAFF_ROLES } from './context/AuthContext';
import { ProtectedRoute, Loading } from './components/common';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Trang công khai
const Home = lazy(() => import('./pages/public/Home'));
const Campaigns = lazy(() => import('./pages/public/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/public/CampaignDetail'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

// Người hiến máu
const DonorOverview = lazy(() => import('./pages/donor/DonorOverview'));
const DonorRegistrations = lazy(() => import('./pages/donor/DonorRegistrations'));
const DonorHistory = lazy(() => import('./pages/donor/DonorHistory'));
const DonorNotifications = lazy(() => import('./pages/donor/DonorNotifications'));
const DonorProfile = lazy(() => import('./pages/donor/DonorProfile'));

// Quản trị / nhân viên
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Donors = lazy(() => import('./pages/admin/Donors'));
const AdminCampaigns = lazy(() => import('./pages/admin/Campaigns'));
const Registrations = lazy(() => import('./pages/admin/Registrations'));
const Screening = lazy(() => import('./pages/admin/Screening'));
const Collection = lazy(() => import('./pages/admin/Collection'));
const Inventory = lazy(() => import('./pages/admin/Inventory'));
const Issues = lazy(() => import('./pages/admin/Issues'));
const BloodGroups = lazy(() => import('./pages/admin/BloodGroups'));
const Facilities = lazy(() => import('./pages/admin/Facilities'));
const Outreach = lazy(() => import('./pages/admin/Outreach'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Staff = lazy(() => import('./pages/admin/Staff'));

const R = ROLES;
const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/me" element={guard([R.NGUOI_HIEN_MAU], <DonorOverview />)} />
              <Route path="/me/registrations" element={guard([R.NGUOI_HIEN_MAU], <DonorRegistrations />)} />
              <Route path="/me/history" element={guard([R.NGUOI_HIEN_MAU], <DonorHistory />)} />
              <Route path="/me/notifications" element={guard([R.NGUOI_HIEN_MAU], <DonorNotifications />)} />
              <Route path="/me/profile" element={guard([R.NGUOI_HIEN_MAU], <DonorProfile />)} />
            </Route>

            <Route path="/admin" element={guard(STAFF_ROLES, <AdminLayout />)}>
              <Route index element={<Dashboard />} />
              <Route path="donors" element={<Donors />} />
              <Route path="campaigns" element={guard([R.QUAN_TRI], <AdminCampaigns />)} />
              <Route path="registrations" element={guard([R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN, R.NHAN_VIEN_SANG_LOC], <Registrations />)} />
              <Route path="screening" element={guard([R.QUAN_TRI, R.NHAN_VIEN_SANG_LOC, R.NHAN_VIEN_TIEP_NHAN], <Screening />)} />
              <Route path="collection" element={guard([R.QUAN_TRI, R.NHAN_VIEN_TIEP_NHAN], <Collection />)} />
              <Route path="inventory" element={guard([R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN], <Inventory />)} />
              <Route path="issues" element={guard([R.QUAN_TRI, R.NHAN_VIEN_KHO], <Issues />)} />
              <Route path="blood-groups" element={<BloodGroups />} />
              <Route path="facilities" element={guard([R.QUAN_TRI, R.NHAN_VIEN_KHO], <Facilities />)} />
              <Route path="outreach" element={guard([R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN], <Outreach />)} />
              <Route path="reports" element={guard([R.QUAN_TRI, R.NHAN_VIEN_KHO, R.NHAN_VIEN_TIEP_NHAN], <Reports />)} />
              <Route path="staff" element={guard([R.QUAN_TRI], <Staff />)} />
            </Route>

            <Route path="/dashboard/*" element={<Navigate to="/admin" replace />} />
            <Route element={<PublicLayout />}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
