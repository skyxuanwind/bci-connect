import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Level1Route from './components/Level1Route';
// import Level2Route from './components/Level2Route';
import CoachRoute from './components/CoachRoute';
import CoreAdminRoute from './components/CoreAdminRoute';
import Layout from './components/Layout';
import BusinessDashboardPage from './pages/BusinessDashboardPage';
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

import FoundationInfo from './pages/FoundationInfo';
import ContentManagement from './pages/admin/ContentManagement';
// 已移除：會員許願版與 AI 智慧通知頁面

import AIProfilePage from './pages/AIProfilePage';
// 已移除：AI 通知測試頁面
import CoachDashboard from './pages/coach/CoachDashboard';

// NFC 電子名片系統組件（新版編輯器）
import CardStudioPro from './pages/CardStudioPro';
import MemberCard from './pages/MemberCard';
import PublicNFCCard from './pages/PublicNFCCard';
import DigitalWallet from './pages/DigitalWallet';
import NFCAnalytics from './pages/NFCAnalytics';
import BusinessMediaList from './pages/BusinessMediaList';
import BusinessMediaAdmin from './pages/admin/BusinessMediaAdmin';

import MBTIAssessment from './pages/MBTIAssessment';
import CoacheeDirectory from './pages/coach/CoacheeDirectory';
import MemberProgress from './pages/MemberProgress';
import ConnectionCeremony from './pages/ConnectionCeremony';
import AdminPanel from './pages/AdminPanel';
import VideoManagementDashboard from './components/admin/AdminDashboard';
import FoundationManagement from './pages/admin/FoundationManagement';
import EventsCalendar from './pages/EventsCalendar';
import ResponsiveDashboard from './pages/ResponsiveDashboard';
import FloatingBackButton from './components/FloatingBackButton';

import IndustryTemplates from './pages/IndustryTemplates';
import LinksPage from './pages/LinksPage';
import ShopPage from './pages/ShopPage';


function App() {
  const location = useLocation();
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flip = typeof window !== 'undefined' && new URLSearchParams(location.search).get('transition') === 'flip';

  const glowVariants = {
  initial: { opacity: 0.6, filter: 'brightness(1.05) blur(4px)', y: 8 },
  animate: { opacity: 1, filter: 'brightness(1) blur(0px)', y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, filter: 'brightness(0.95) blur(6px)', y: -6, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  };
  const flipVariants = {
    initial: { rotateY: -8, opacity: 0.6 },
    animate: { rotateY: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { rotateY: 8, opacity: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  };
  const variants = prefersReducedMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : (flip ? flipVariants : glowVariants);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-primary-900">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial="initial" animate="animate" exit="exit" variants={variants} style={{ perspective: 1000 }}>
            <Routes location={location}>
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

          {/* Member Progress Page */}
          <Route path="/progress/:id" element={
            <ProtectedRoute>
              <Layout>
                <MemberProgress />
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
          
          <Route path="/events/calendar" element={
            <ProtectedRoute>
              <Layout>
                <EventsCalendar />
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
          

          
          {/* 已移除：會員許願版與 AI 智慧通知路由 */}
          
          <Route path="/ai-profile" element={
            <ProtectedRoute>
              <Layout>
                <AIProfilePage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Business Dashboard - standalone page */}
          <Route path="/business-dashboard" element={
            <ProtectedRoute>
              <Layout>
                <BusinessDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 新增：手機App版（手機版 APP 體驗，桌面維持現有設計） */}
          <Route path="/mobile-app" element={
            <ProtectedRoute>
              <Layout>
                <ResponsiveDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 臨時公開版：行動端驗證用（不需登入） */}
          <Route path="/m/mobile-app" element={
            <Layout>
              <ResponsiveDashboard />
            </Layout>
          } />
          
          {/* 已移除：AI 通知測試路由 */}
          
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
          


          
          {/* GBC 連結之橋儀式 - Core/Admin only */}
          <Route path="/connection-ceremony" element={
            <CoreAdminRoute>
              <ConnectionCeremony />
            </CoreAdminRoute>
          } />
          
          {/* 管理員控制面板 - Core/Admin only */}
          <Route path="/admin-panel" element={
            <CoreAdminRoute>
              <AdminPanel />
            </CoreAdminRoute>
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
          
          <Route
            path="/admin/foundation-management"
            element={
              <AdminRoute>
                <Layout>
                  <FoundationManagement />
                </Layout>
              </AdminRoute>
            }
          />
          
          <Route path="/admin/business-media" element={
            <AdminRoute>
              <Layout>
                <BusinessMediaAdmin />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/admin/video-management" element={
            <AdminRoute>
              <VideoManagementDashboard />
            </AdminRoute>
          } />
          
          {/* NFC Routes */}
          <Route path="/nfc-card-editor" element={
            (process.env.NODE_ENV !== 'production') ? (
              <Layout>
                <CardStudioPro />
              </Layout>
            ) : (
              <ProtectedRoute>
                <Layout>
                  <CardStudioPro />
                </Layout>
              </ProtectedRoute>
            )
          } />

          {/* Linktree 風格 Studio（NFC 電子名片編輯器新介面） */}
          <Route path="/studio" element={
            <Navigate to="/nfc-card-editor" replace />
          } />
          <Route path="/digital-wallet" element={
            <ProtectedRoute>
              <Layout>
                <DigitalWallet />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/card/:memberId" element={<MemberCard />} />
          {/* 別名路由：完整版名片頁 */}
          <Route path="/member-card/:memberId" element={<MemberCard />} />
          {/* Public NFC Card viewer route */}
          <Route path="/public-nfc-card/:memberId" element={<PublicNFCCard />} />
          <Route path="/industry-templates" element={<IndustryTemplates />} />
          <Route path="/member-card/:memberId/links" element={<LinksPage />} />
          <Route path="/member-card/:memberId/shop" element={<ShopPage />} />
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
          </motion.div>
        </AnimatePresence>
        {/* 浮動返回按鈕：除首頁外顯示，形成進入/返回閉環效果 */}
        <AnimatePresence initial={false}>
          {location.pathname !== '/mobile-app' && (
            <FloatingBackButton show />
          )}
        </AnimatePresence>
        <ToastContainer />
        </div>
    </AuthProvider>
  );
}

export default App;