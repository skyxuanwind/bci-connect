const express = require('express');
const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');

const router = express.Router();

// 資料庫連接配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gbc_connect',
    charset: 'utf8mb4'
};

// 創建資料庫連接池
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 20, // 增加連接數以提高響應速度
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
});

// 緩存系統 - 用於快速響應
const videoCache = new Map();
const memberCache = new Map();
const ruleCache = new Map();

// 初始化緩存
const initializeCache = async () => {
    try {
        console.log('正在初始化NFC觸發系統緩存...');
        
        // 緩存預設影片
        const [defaultVideos] = await pool.execute(`
            SELECT id, title, file_url, duration, thumbnail_url, resolution
            FROM ceremony_videos 
            WHERE is_default = TRUE AND is_active = TRUE
            LIMIT 1
        `);
        
        if (defaultVideos.length > 0) {
            videoCache.set('default', defaultVideos[0]);
        }
        
        // 緩存播放規則
        const [rules] = await pool.execute(`
            SELECT r.*, v.file_url, v.title, v.duration, v.thumbnail_url
            FROM video_play_rules r
            JOIN ceremony_videos v ON r.video_id = v.id
            WHERE r.is_active = TRUE AND v.is_active = TRUE
            ORDER BY r.priority DESC
        `);
        
        rules.forEach(rule => {
            ruleCache.set(rule.id, rule);
        });
        
        console.log(`緩存初始化完成: ${videoCache.size} 個預設影片, ${ruleCache.size} 個播放規則`);
    } catch (error) {
        console.error('緩存初始化失敗:', error);
    }
};

// 啟動時初始化緩存
initializeCache();

// 定期更新緩存 (每5分鐘)
setInterval(initializeCache, 5 * 60 * 1000);

// 工具函數：根據規則選擇影片
const selectVideoByRules = async (memberInfo, nfcCardId) => {
    try {
        // 按優先級檢查規則
        const sortedRules = Array.from(ruleCache.values()).sort((a, b) => b.priority - a.priority);
        
        for (const rule of sortedRules) {
            let shouldPlay = false;
            
            switch (rule.rule_type) {
                case 'default':
                    shouldPlay = true;
                    break;
                    
                case 'member_type':
                    if (memberInfo && rule.conditions) {
                        const conditions = JSON.parse(rule.conditions);
                        shouldPlay = conditions.member_types?.includes(memberInfo.member_type);
                    }
                    break;
                    
                case 'industry':
                    if (memberInfo && rule.conditions) {
                        const conditions = JSON.parse(rule.conditions);
                        shouldPlay = conditions.industries?.includes(memberInfo.industry);
                    }
                    break;
                    
                case 'time_based':
                    if (rule.conditions) {
                        const conditions = JSON.parse(rule.conditions);
                        const currentHour = new Date().getHours();
                        shouldPlay = currentHour >= conditions.start_hour && currentHour <= conditions.end_hour;
                    }
                    break;
                    
                case 'random':
                    if (rule.conditions) {
                        const conditions = JSON.parse(rule.conditions);
                        shouldPlay = Math.random() < (conditions.probability || 0.5);
                    }
                    break;
            }
            
            if (shouldPlay) {
                return {
                    id: rule.video_id,
                    title: rule.title,
                    file_url: rule.file_url,
                    duration: rule.duration,
                    thumbnail_url: rule.thumbnail_url,
                    rule_id: rule.id,
                    rule_name: rule.rule_name
                };
            }
        }
        
        // 如果沒有匹配的規則，返回預設影片
        return videoCache.get('default') || null;
    } catch (error) {
        console.error('選擇影片規則失敗:', error);
        return videoCache.get('default') || null;
    }
};

// 工具函數：記錄觸發事件
const logTriggerEvent = async (nfcCardId, memberId, videoId, ruleId, responseTime, deviceInfo) => {
    try {
        await pool.execute(`
            INSERT INTO nfc_video_triggers 
            (nfc_card_id, member_id, video_id, rule_id, response_time_ms, device_info)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [nfcCardId, memberId, videoId, ruleId, responseTime, JSON.stringify(deviceInfo)]);
    } catch (error) {
        console.error('記錄觸發事件失敗:', error);
    }
};

// 工具函數：更新播放統計
const updatePlayStatistics = async (videoId) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        await pool.execute(`
            INSERT INTO video_play_statistics (video_id, date, play_count, total_duration)
            VALUES (?, ?, 1, 0)
            ON DUPLICATE KEY UPDATE 
            play_count = play_count + 1
        `, [videoId, today]);
    } catch (error) {
        console.error('更新播放統計失敗:', error);
    }
};

// API 路由

// 1. NFC觸發影片播放 (核心API - 要求500ms內響應)
router.post('/trigger', async (req, res) => {
    const startTime = performance.now();
    const { nfc_card_id, device_info } = req.body;
    
    try {
        // 快速驗證
        if (!nfc_card_id) {
            return res.status(400).json({
                success: false,
                message: 'NFC卡片ID不能為空',
                response_time_ms: Math.round(performance.now() - startTime)
            });
        }
        
        // 從緩存或資料庫快速獲取會員信息
        let memberInfo = memberCache.get(nfc_card_id);
        
        if (!memberInfo) {
            // 快速查詢會員信息
            const [members] = await pool.execute(`
                SELECT id, name, industry, member_type, is_active
                FROM members 
                WHERE nfc_card_id = ? AND is_active = TRUE
                LIMIT 1
            `, [nfc_card_id]);
            
            if (members.length > 0) {
                memberInfo = members[0];
                // 緩存會員信息 (5分鐘)
                memberCache.set(nfc_card_id, memberInfo);
                setTimeout(() => memberCache.delete(nfc_card_id), 5 * 60 * 1000);
            }
        }
        
        // 根據規則選擇影片
        const selectedVideo = await selectVideoByRules(memberInfo, nfc_card_id);
        
        if (!selectedVideo) {
            return res.status(404).json({
                success: false,
                message: '未找到可播放的影片',
                response_time_ms: Math.round(performance.now() - startTime)
            });
        }
        
        const responseTime = Math.round(performance.now() - startTime);
        
        // 異步記錄事件和統計 (不影響響應時間)
        setImmediate(() => {
            logTriggerEvent(
                nfc_card_id,
                memberInfo?.id || null,
                selectedVideo.id,
                selectedVideo.rule_id || null,
                responseTime,
                device_info || {}
            );
            updatePlayStatistics(selectedVideo.id);
        });
        
        // 快速響應
        res.json({
            success: true,
            data: {
                video: {
                    id: selectedVideo.id,
                    title: selectedVideo.title,
                    file_url: selectedVideo.file_url,
                    duration: selectedVideo.duration,
                    thumbnail_url: selectedVideo.thumbnail_url
                },
                member: memberInfo ? {
                    id: memberInfo.id,
                    name: memberInfo.name,
                    industry: memberInfo.industry,
                    member_type: memberInfo.member_type
                } : null,
                rule_applied: selectedVideo.rule_name || 'default',
                response_time_ms: responseTime,
                cache_hit: !!memberCache.get(nfc_card_id)
            }
        });
        
        // 檢查響應時間警告
        if (responseTime > 500) {
            console.warn(`NFC觸發響應時間超標: ${responseTime}ms (目標: <500ms)`);
        }
        
    } catch (error) {
        const responseTime = Math.round(performance.now() - startTime);
        console.error('NFC觸發失敗:', error);
        
        res.status(500).json({
            success: false,
            message: 'NFC觸發系統錯誤',
            response_time_ms: responseTime
        });
    }
});

// 2. 預載影片資源 (用於提高播放流暢度)
router.post('/preload', async (req, res) => {
    const { video_ids } = req.body;
    
    try {
        if (!Array.isArray(video_ids) || video_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: '請提供要預載的影片ID列表'
            });
        }
        
        const placeholders = video_ids.map(() => '?').join(',');
        const [videos] = await pool.execute(`
            SELECT id, title, file_url, duration, file_size, thumbnail_url
            FROM ceremony_videos
            WHERE id IN (${placeholders}) AND is_active = TRUE
        `, video_ids);
        
        res.json({
            success: true,
            data: {
                preload_videos: videos,
                total_size: videos.reduce((sum, video) => sum + (video.file_size || 0), 0)
            }
        });
    } catch (error) {
        console.error('預載影片失敗:', error);
        res.status(500).json({
            success: false,
            message: '預載影片失敗'
        });
    }
});

// 3. 記錄播放完成
router.post('/complete', async (req, res) => {
    const { trigger_id, actual_duration, completed } = req.body;
    
    try {
        await pool.execute(`
            UPDATE nfc_video_triggers 
            SET play_duration = ?, is_completed = ?
            WHERE id = ?
        `, [actual_duration, completed, trigger_id]);
        
        // 更新完成率統計
        if (completed) {
            const today = new Date().toISOString().split('T')[0];
            
            // 獲取今日播放統計
            const [stats] = await pool.execute(`
                SELECT play_count, completion_rate
                FROM video_play_statistics
                WHERE video_id = (
                    SELECT video_id FROM nfc_video_triggers WHERE id = ?
                ) AND date = ?
            `, [trigger_id, today]);
            
            if (stats.length > 0) {
                const currentStats = stats[0];
                const newCompletionRate = ((currentStats.completion_rate * (currentStats.play_count - 1)) + 100) / currentStats.play_count;
                
                await pool.execute(`
                    UPDATE video_play_statistics
                    SET completion_rate = ?, total_duration = total_duration + ?
                    WHERE video_id = (
                        SELECT video_id FROM nfc_video_triggers WHERE id = ?
                    ) AND date = ?
                `, [newCompletionRate, actual_duration, trigger_id, today]);
            }
        }
        
        res.json({ success: true, message: '播放記錄更新成功' });
    } catch (error) {
        console.error('更新播放記錄失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新播放記錄失敗'
        });
    }
});

// 4. 獲取系統性能統計
router.get('/performance', async (req, res) => {
    const { start_date, end_date } = req.query;
    
    try {
        let whereClause = '';
        let params = [];
        
        if (start_date && end_date) {
            whereClause = 'WHERE DATE(trigger_time) BETWEEN ? AND ?';
            params = [start_date, end_date];
        } else {
            // 預設查詢最近7天
            whereClause = 'WHERE trigger_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        }
        
        // 響應時間統計
        const [responseStats] = await pool.execute(`
            SELECT 
                AVG(response_time_ms) as avg_response_time,
                MIN(response_time_ms) as min_response_time,
                MAX(response_time_ms) as max_response_time,
                COUNT(*) as total_triggers,
                SUM(CASE WHEN response_time_ms <= 500 THEN 1 ELSE 0 END) as fast_responses,
                SUM(CASE WHEN response_time_ms > 500 THEN 1 ELSE 0 END) as slow_responses
            FROM nfc_video_triggers
            ${whereClause}
        `, params);
        
        // 每日觸發統計
        const [dailyStats] = await pool.execute(`
            SELECT 
                DATE(trigger_time) as date,
                COUNT(*) as trigger_count,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed_plays
            FROM nfc_video_triggers
            ${whereClause}
            GROUP BY DATE(trigger_time)
            ORDER BY date DESC
        `, params);
        
        const stats = responseStats[0];
        const performanceScore = stats.total_triggers > 0 
            ? Math.round((stats.fast_responses / stats.total_triggers) * 100)
            : 0;
        
        res.json({
            success: true,
            data: {
                performance_summary: {
                    avg_response_time_ms: Math.round(stats.avg_response_time || 0),
                    min_response_time_ms: stats.min_response_time || 0,
                    max_response_time_ms: stats.max_response_time || 0,
                    total_triggers: stats.total_triggers || 0,
                    fast_responses: stats.fast_responses || 0,
                    slow_responses: stats.slow_responses || 0,
                    performance_score: performanceScore,
                    target_met: performanceScore >= 95 // 95%的觸發應在500ms內
                },
                daily_statistics: dailyStats,
                cache_status: {
                    video_cache_size: videoCache.size,
                    member_cache_size: memberCache.size,
                    rule_cache_size: ruleCache.size
                }
            }
        });
    } catch (error) {
        console.error('獲取性能統計失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取性能統計失敗'
        });
    }
});

// 5. 清除緩存 (管理功能)
router.post('/cache/clear', async (req, res) => {
    try {
        videoCache.clear();
        memberCache.clear();
        ruleCache.clear();
        
        // 重新初始化緩存
        await initializeCache();
        
        res.json({
            success: true,
            message: '緩存已清除並重新初始化'
        });
    } catch (error) {
        console.error('清除緩存失敗:', error);
        res.status(500).json({
            success: false,
            message: '清除緩存失敗'
        });
    }
});

// 6. 健康檢查
router.get('/health', async (req, res) => {
    const startTime = performance.now();
    
    try {
        // 測試資料庫連接
        await pool.execute('SELECT 1');
        
        const responseTime = Math.round(performance.now() - startTime);
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                response_time_ms: responseTime,
                cache_status: {
                    video_cache: videoCache.size,
                    member_cache: memberCache.size,
                    rule_cache: ruleCache.size
                },
                database_connection: 'ok'
            }
        });
    } catch (error) {
        const responseTime = Math.round(performance.now() - startTime);
        
        res.status(500).json({
            success: false,
            data: {
                status: 'unhealthy',
                response_time_ms: responseTime,
                error: error.message
            }
        });
    }
});

module.exports = router;