import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const ProjectPlan = () => {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [projectPlan, setProjectPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemberData();
    fetchProjectPlan();
  }, [id]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/users/${id}`);
      setMember(response.data);
    } catch (err) {
      console.error('Failed to fetch member data:', err);
      setError('無法載入會員資料');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectPlan = async () => {
    try {
      setLoadingPlan(true);
      const response = await axios.get(`/api/users/member/${id}/project-plan`);
      setProjectPlan(response.data || null);
    } catch (err) {
      console.error('Failed to load project plan:', err);
      setError('無法載入專案計劃');
    } finally {
      setLoadingPlan(false);
    }
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '金級會員', class: 'bg-yellow-100 text-yellow-800' },
      2: { text: '銀級會員', class: 'bg-gray-100 text-gray-800' },
      3: { text: '銅級會員', class: 'bg-orange-100 text-orange-800' }
    };
    const badge = badges[level] || { text: '未知', class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { text: '啟用', class: 'bg-green-100 text-green-800' },
      'pending': { text: '待審核', class: 'bg-yellow-100 text-yellow-800' },
      'suspended': { text: '停權', class: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status] || { text: '未知', class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Link to="/members" className="text-blue-600 hover:text-blue-800">
          返回會員列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按鈕 */}
      <div className="mb-6">
        <Link
          to={`/members/${id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          返回會員詳情
        </Link>
      </div>

      {/* 會員基本資訊 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white mb-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar
              src={member?.profilePictureUrl}
              alt={member?.name}
              size="xl"
              className="bg-white bg-opacity-20"
              fallbackIcon={UserIcon}
              fallbackIconClass="text-white"
            />
          </div>
          <div className="ml-6 flex-1">
            <h1 className="text-2xl font-bold">{member?.name}</h1>
            <p className="text-blue-100 mt-1">{member?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {member?.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
              {member?.status ? getStatusBadge(member.status) : null}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* 專案計劃內容 */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
            專案計劃（12 項自動判定）
          </h2>
        </div>
        
        <div className="p-6">
          {loadingPlan && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">載入專案計劃中...</span>
            </div>
          )}
          
          {!loadingPlan && projectPlan && (
            <>
              {/* 進度總覽 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-medium text-gray-900">完成進度</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {projectPlan.summary?.percent || 0}%
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${projectPlan.summary?.percent || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>已完成 {projectPlan.summary?.completedCount || 0} 項</span>
                  <span>共 {projectPlan.summary?.total || 0} 項</span>
                </div>
              </div>

              {/* 項目列表 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">項目詳情</h3>
                {projectPlan.items?.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      item.completed
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        {item.completed ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          item.completed ? 'text-green-800' : 'text-gray-800'
                        }`}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                        {item.value && (
                          <div className="text-sm text-blue-600 mt-1 font-medium">
                            {item.value}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.completed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.completed ? '已完成' : '待完成'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 最後更新時間 */}
              {projectPlan.summary?.lastUpdated && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    最後更新：{new Date(projectPlan.summary.lastUpdated).toLocaleString('zh-TW')}
                  </div>
                </div>
              )}
            </>
          )}
          
          {!loadingPlan && !projectPlan && (
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <div className="text-lg text-gray-600 mb-2">尚無專案計劃資料</div>
              <div className="text-sm text-gray-500">
                專案計劃將根據會員的活動參與情況自動生成
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPlan;