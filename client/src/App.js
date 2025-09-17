import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Level1Route from './components/Level1Route';
// import Level2Route from './components/Level2Route';
import CoachRoute from './components/CoachRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import MemberInterview from './pages/MemberInterview';
import ProjectPlan from './pages/ProjectPlan';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PendingUsers from './pages/admin/PendingUsers';
import ChapterManagement from './pages/admin/ChapterManagement';
import NotFound from './pages/NotFound';
import ReferralSystem from './pages/ReferralSystem';
import MeetingScheduler from './pages/MeetingScheduler';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import EventManagement from './pages/admin/EventManagement';
import GuestRegistration from './pages/GuestRegistration';

import ProspectVoting from './pages/ProspectVoting';
import ProspectApplication from './pages/ProspectApplication';


import ProspectDetail from './pages/ProspectDetail';
import BlacklistManagement from './pages/BlacklistManagement';
import FinancialStatement from './pages/FinancialStatement';
import ComplaintBox from './pages/ComplaintBox';
import CheckInScanner from './pages/CheckInScanner';
import AttendanceManagement from './pages/AttendanceManagement';
import JudgmentSync from './pages/JudgmentSync';
import FoundationInfo from './pages/FoundationInfo';
import ContentManagement from './pages/admin/ContentManagement';
import WishesPage from './pages/WishesPage';
import NotificationsPage from './pages/NotificationsPage';

import AIProfilePage from './pages/AIProfilePage';
import AINotificationTestPage from './pages/AINotificationTestPage';
import CoachDashboard from './pages/coach/CoachDashboard';

// NFC 電子名片系統組件
import NFCCardEditor from './pages/NFCCardEditor';
import MemberCard from './pages/MemberCard';
import DigitalWallet from './pages/DigitalWallet';
import NFCAnalytics from './pages/NFCAnalytics';
import BusinessMediaList from './pages/BusinessMediaList';
import BusinessMediaAdmin from './pages/admin/BusinessMediaAdmin';

import MBTIAssessment from './pages/MBTIAssessment';
import CoacheeDirectory from './pages/coach/CoacheeDirectory';



function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-primary-900">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guest-registration" element={<GuestRegistration />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 新增：MBTI 測評頁面 */}
          <Route path="/mbti-assessment" element={
            <ProtectedRoute>
              <Layout>
                <MBTIAssessment />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/members" element={
            <ProtectedRoute>
              <Layout>
                <Members />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/members/:id" element={
            <ProtectedRoute>
              <Layout>
                <MemberDetail />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/member-interview/:id" element={
            <ProtectedRoute>
              <Layout>
                <MemberInterview />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/project-plans/:id" element={
            <ProtectedRoute>
              <Layout>
                <ProjectPlan />
              </Layout>
            </ProtectedRoute>
          } />
          

          

          

          
          <Route path="/referrals" element={
            <ProtectedRoute>
              <Layout>
                <ReferralSystem />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/meetings" element={
            <ProtectedRoute>
              <Layout>
                <MeetingScheduler />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/events" element={
            <ProtectedRoute>
              <Layout>
                <Events />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/events/:id" element={
            <ProtectedRoute>
              <Layout>
                <EventDetail />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/foundation" element={
            <ProtectedRoute>
              <Layout>
                <FoundationInfo />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/business-media" element={
            <ProtectedRoute>
              <Layout>
                <BusinessMediaList />
              </Layout>
            </ProtectedRoute>
          } />
          

          
          <Route path="/wishes" element={
            <ProtectedRoute>
              <Layout>
                <WishesPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/ai-profile" element={
            <ProtectedRoute>
              <Layout>
                <AIProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/ai-notification-test" element={
            <ProtectedRoute>
              <Layout>
                <AINotificationTestPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Coach Routes - now visible to all authenticated users */}
          <Route path="/coach" element={
            <ProtectedRoute>
              <Layout>
                <CoachDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Coach: Coachee Directory (coach/admin only) */}
          <Route path="/coachees" element={
            <CoachRoute>
              <Layout>
                <CoacheeDirectory />
              </Layout>
            </CoachRoute>
          } />

          {/* Management Features Routes - Admin & Level 1 */}
          <Route path="/prospect-application" element={
            <Level1Route>
              <Layout>
                <ProspectApplication />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/prospect-voting" element={
            <Level1Route>
              <Layout>
                <ProspectVoting />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/blacklist" element={
            <Level1Route>
              <Layout>
                <BlacklistManagement />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/financial" element={
            <Level1Route>
              <Layout>
                <FinancialStatement />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/complaints" element={
            <Level1Route>
              <Layout>
                <ComplaintBox />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/checkin-scanner" element={
            <Level1Route>
              <Layout>
                <CheckInScanner />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/attendance-management" element={
            <Level1Route>
              <Layout>
                <AttendanceManagement />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/judgment-sync" element={
            <Level1Route>
              <Layout>
                <JudgmentSync />
              </Layout>
            </Level1Route>
          } />

          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/admin/users" element={
            <AdminRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/admin/pending" element={
            <AdminRoute>
              <Layout>
                <PendingUsers />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/admin/chapters" element={
            <AdminRoute>
              <Layout>
                <ChapterManagement />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/admin/events" element={
            <AdminRoute>
              <Layout>
                <EventManagement />
              </Layout>
            </AdminRoute>
          } />
          

          
          <Route path="/admin/business-media" element={
            <AdminRoute>
              <Layout>
                <BusinessMediaAdmin />
              </Layout>
            </AdminRoute>
          } />
          
          {/* NFC Routes */}
          <Route path="/nfc-card-editor" element={
            <ProtectedRoute>
              <Layout>
                <NFCCardEditor />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/digital-wallet" element={
            <ProtectedRoute>
              <Layout>
                <DigitalWallet />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/member-card/:id" element={<MemberCard />} />
          <Route path="/nfc-analytics" element={
            <ProtectedRoute>
              <Layout>
                <NFCAnalytics />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer />
      </div>
    </AuthProvider>
  );
}

export default App;