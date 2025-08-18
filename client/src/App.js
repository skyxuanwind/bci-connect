import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Level1Route from './components/Level1Route';
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

import ProspectVoting from './pages/ProspectVoting';
import ProspectApplication from './pages/ProspectApplication';
import ProspectDetail from './pages/ProspectDetail';
import BlacklistManagement from './pages/BlacklistManagement';
import FinancialStatement from './pages/FinancialStatement';
import ComplaintBox from './pages/ComplaintBox';
import FoundationInfo from './pages/FoundationInfo';
import ContentManagement from './pages/admin/ContentManagement';
import CheckInScanner from './pages/CheckInScanner';
import AttendanceManagement from './pages/AttendanceManagement';
import JudicialTest from './pages/JudicialTest';
import JudgmentSync from './pages/JudgmentSync';
import NFCTest from './pages/NFCTest';
import NFCLocalTest from './pages/NFCLocalTest';


function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          

          
          <Route path="/prospects/:id" element={
            <Level1Route>
              <Layout>
                <ProspectDetail />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/admin/content" element={
            <AdminRoute>
              <Layout>
                <ContentManagement />
              </Layout>
            </AdminRoute>
          } />
          
          <Route path="/prospect-voting" element={
            <Level1Route>
              <Layout>
                <ProspectVoting />
              </Layout>
            </Level1Route>
          } />
          
          <Route path="/prospect-application" element={
            <Level1Route>
              <Layout>
                <ProspectApplication />
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
            <ProtectedRoute>
              <Layout>
                <FinancialStatement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/complaints" element={
            <ProtectedRoute>
              <Layout>
                <ComplaintBox />
              </Layout>
            </ProtectedRoute>
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
          
          <Route path="/judicial-test" element={
          <Level1Route>
            <Layout>
              <JudicialTest />
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
        
        <Route path="/nfc-test" element={
          <ProtectedRoute>
            <Layout>
              <NFCTest />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/nfc-local-test" element={
          <ProtectedRoute>
            <Layout>
              <NFCLocalTest />
            </Layout>
          </ProtectedRoute>
        } />
          
          {/* Catch all route */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </AuthProvider>
  );
}

export default App;