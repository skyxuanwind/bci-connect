import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CardholderAuth from './CardholderAuth';
import CardholderDashboard from './CardholderDashboard';
import CardholderTestPage from './CardholderTestPage';

const CardholderRoutes = () => {
  const isAuthenticated = () => {
    return localStorage.getItem('cardholderToken') !== null;
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/cardholder/auth" replace />;
  };

  return (
    <Routes>
      <Route path="/auth" element={<CardholderAuth />} />
      <Route path="/test" element={<CardholderTestPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <CardholderDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/cardholder/dashboard" replace />} />
    </Routes>
  );
};

export default CardholderRoutes;