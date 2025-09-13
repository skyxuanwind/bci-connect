import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const CoachRoute = ({ children }) => {
  const { isAuthenticated, loading, isCoach, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow access for coaches or admins
  if (!(isCoach && isCoach()) && !(isAdmin && isAdmin())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-elegant p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            權限不足
          </h3>
          
          <p className="text-gray-600 mb-6">
            您沒有權限訪問此頁面。此頁面僅限教練或管理員使用。
          </p>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn-primary w-full"
          >
            返回儀表板
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default CoachRoute;