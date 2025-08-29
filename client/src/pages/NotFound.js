import React from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            
            {/* Error Code */}
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            
            {/* Error Message */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              頁面不存在
            </h2>
            <p className="text-gray-600 mb-8">
              抱歉，您要尋找的頁面不存在或已被移除。
            </p>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/"
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                返回首頁
              </Link>
              
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                返回上一頁
              </button>
            </div>
            
            {/* Help Text */}
            <div className="mt-8 text-sm text-gray-500">
              <p>如果您認為這是一個錯誤，請聯繫系統管理員。</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          © 2025 GBC商務菁英會. 版權所有.
        </p>
      </div>
    </div>
  );
};

export default NotFound;