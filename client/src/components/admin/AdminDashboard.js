import React, { useState, useEffect } from 'react';
import VideoManagement from './VideoManagement';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('videos');
    const [systemStats, setSystemStats] = useState({
        totalVideos: 0,
        totalPlays: 0,
        nfcTriggers: 0,
        storageUsed: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSystemStats();
    }, []);

    const fetchSystemStats = async () => {
        try {
            setIsLoading(true);
            
            // 獲取系統統計數據
            const [videosResponse, statsResponse] = await Promise.all([
                fetch('/api/video-management/videos'),
                fetch('/api/nfc-trigger/stats')
            ]);

            if (videosResponse.ok && statsResponse.ok) {
                const videosData = await videosResponse.json();
                const statsData = await statsResponse.json();

                setSystemStats({
                    totalVideos: videosData.total || 0,
                    totalPlays: statsData.totalPlays || 0,
                    nfcTriggers: statsData.nfcTriggers || 0,
                    storageUsed: statsData.storageUsed || 0
                });
            }
        } catch (error) {
            console.error('獲取系統統計失敗:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const tabs = [
        {
            id: 'videos',
            label: '影片管理',
            icon: 'fas fa-video',
            component: VideoManagement
        },
        {
            id: 'analytics',
            label: '數據分析',
            icon: 'fas fa-chart-bar',
            component: () => <div className="coming-soon">數據分析功能開發中...</div>
        },
        {
            id: 'settings',
            label: '系統設置',
            icon: 'fas fa-cog',
            component: () => <div className="coming-soon">系統設置功能開發中...</div>
        }
    ];

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || VideoManagement;

    return (
        <div className="admin-dashboard">
            {/* 頭部導航 */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <h1>
                            <i className="fas fa-crown"></i>
                            GBC 宣誓儀式管理後台
                        </h1>
                        <p>影片播放系統管理中心</p>
                    </div>
                    <div className="header-right">
                        <div className="user-info">
                            <i className="fas fa-user-shield"></i>
                            <span>管理員</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 統計卡片 */}
            <div className="stats-section">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon videos">
                            <i className="fas fa-video"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{isLoading ? '...' : systemStats.totalVideos}</h3>
                            <p>總影片數量</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon plays">
                            <i className="fas fa-play-circle"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{isLoading ? '...' : systemStats.totalPlays.toLocaleString()}</h3>
                            <p>總播放次數</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon nfc">
                            <i className="fas fa-wifi"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{isLoading ? '...' : systemStats.nfcTriggers.toLocaleString()}</h3>
                            <p>NFC 觸發次數</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon storage">
                            <i className="fas fa-hdd"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{isLoading ? '...' : formatFileSize(systemStats.storageUsed)}</h3>
                            <p>存儲空間使用</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主要內容區域 */}
            <div className="dashboard-content">
                {/* 側邊導航 */}
                <nav className="sidebar">
                    <div className="nav-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={tab.icon}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* 主要內容 */}
                <main className="main-content">
                    <div className="content-wrapper">
                        <ActiveComponent onStatsUpdate={fetchSystemStats} />
                    </div>
                </main>
            </div>

            {/* 系統狀態指示器 */}
            <div className="system-status">
                <div className="status-indicator online">
                    <i className="fas fa-circle"></i>
                    <span>系統運行正常</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;