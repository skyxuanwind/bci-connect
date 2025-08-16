import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../config/axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



// Request interceptor to add token
// Helper function to get cookie value
const getCookieValue = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Force clear all authentication data
      Cookies.remove('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      // Show error message for invalid token
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('登入已過期，請重新登入');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { token, user: userData } = response.data;
      
      // Store token in cookie (7 days expiry)
      // Use secure: false for local development (HTTP), secure: true for production (HTTPS)
      const isProduction = process.env.NODE_ENV === 'production';
      Cookies.set('token', token, { 
        expires: 7, 
        secure: isProduction, 
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
        domain: isProduction ? undefined : 'localhost'
      });
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Check for pending event registration
      const pendingRegistration = localStorage.getItem('pendingEventRegistration');
      if (pendingRegistration) {
        try {
          const { eventId, inviterId } = JSON.parse(pendingRegistration);
          
          // Register for the event
          await axios.post(`/api/events/${eventId}/register`, {
            invitedById: inviterId
          });
          
          localStorage.removeItem('pendingEventRegistration');
          toast.success('登入成功！已自動為您報名邀請的活動。');
        } catch (error) {
          console.error('Auto event registration failed:', error);
          toast.success('登入成功！');
          toast.error('自動報名活動失敗，請手動報名。');
        }
      } else {
        toast.success('登入成功！');
      }
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || '登入失敗，請稍後再試';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      // Check if userData is FormData (for avatar upload)
      const config = userData instanceof FormData ? {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      } : {};
      
      const response = await axios.post('/api/auth/register', userData, config);
      toast.success('註冊成功！請等待管理員審核');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || '註冊失敗，請稍後再試';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('token');
      setUser(null);
      setIsAuthenticated(false);
      toast.success('已成功登出');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Check if profileData is FormData (for avatar upload)
      const config = profileData instanceof FormData ? {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      } : {};
      
      const response = await axios.put('/api/users/profile', profileData, config);
      
      // Update user state with new profile data
      setUser(prevUser => ({
        ...prevUser,
        ...response.data.profile
      }));
      
      toast.success('個人資料更新成功');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || '更新失敗，請稍後再試';
      toast.error(message);
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/api/users/password', {
        currentPassword,
        newPassword
      });
      
      toast.success('密碼更新成功');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || '密碼更新失敗，請稍後再試';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && user.membershipLevel === 1 && user.email.includes('admin');
  };

  // Helper function to check membership level access
  const hasAccess = (requiredLevel) => {
    if (!user || !user.membershipLevel) return false;
    return user.membershipLevel <= requiredLevel;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    token: Cookies.get('token'),
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    checkAuthStatus,
    isAdmin,
    hasAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};