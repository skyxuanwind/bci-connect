import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import videoCacheService from '../services/videoCacheService';
import nfcCoordinator from '../services/nfcCoordinator';

const ConnectionCeremony = () => {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ceremonyStage, setCeremonyStage] = useState('loading'); // loading, oath, video, welcome, bridge, ceremony, completed
  const [bridgeData, setBridgeData] = useState([]);
  const [oath, setOath] = useState('');
  const [newMember, setNewMember] = useState(null);
  const [nfcCardId, setNfcCardId] = useState('');
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [oathText, setOathText] = useState('');
  const [nfcInput, setNfcInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [ceremonyProgress, setCeremonyProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [ceremonySettings, setCeremonySettings] = useState({
    enableSound: true,
    enableParticles: true,
    enableGuide: true,
    autoProgress: false,
    transitionDuration: 500
  });
  
  // NFC Gateway 相關狀態
  const [isNfcReading, setIsNfcReading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [nfcError, setNfcError] = useState(null);
  const [nfcSuccess, setNfcSuccess] = useState(null);
  const [connecting, setConnecting] = useState(false);
  
  // Gateway Service URL - 始終使用本地 NFC Gateway 服務
  const GATEWAY_URL = process.env.REACT_APP_NFC_GATEWAY_URL || 'http://localhost:3002';
  
  // 影片播放相關狀態
  const [videoData, setVideoData] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  
  // 影片緩存相關狀態
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);
  
  // 黑金尊榮文字特效狀態
  const [prestigeOverlayVisible, setPrestigeOverlayVisible] = useState(false);
  const [prestigeOverlayShown, setPrestigeOverlayShown] = useState(false);
  const overlayTimeoutRef = useRef(null);
  
  const ceremonyRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneObjectRef = useRef();
  const pillarsRef = useRef([]);
  const animationIdRef = useRef();
  const nfcInputRef = useRef(null);
  const videoRef = useRef(null);
  // 記錄使用者按下「啟動自動感應」的時間，僅接受此時間之後的掃描
  const readerStartAtRef = useRef(0);
  
  // 添加粒子系統和光影效果的引用
  const particleSystemRef = useRef(null);
  const lightBeamRef = useRef(null);
  const ambientLightRef = useRef(null);
  const goldParticlesRef = useRef(null);
  
  // 攝影機動畫系統的狀態和引用
  const [cameraAnimation, setCameraAnimation] = useState({
    isPlaying: false,
    currentSequence: null,
    progress: 0,
    autoPlay: true
  });
  const cameraAnimationRef = useRef(null);
  const animationTimelineRef = useRef([]);
  const animationStartTimeRef = useRef(0);

  // 檢查權限
  useEffect(() => {
    // Level 1 = Core 用戶，或者郵箱包含 'admin' 的管理員
    const isCore = Number(user?.membershipLevel) === 1;
    const isAdmin = user?.email?.includes('admin') && Number(user?.membershipLevel) === 1;
    
    if (!user || (!isCore && !isAdmin)) {
      toast.error('您沒有權限訪問此頁面');
      return;
    }
    
    initializeCeremony();
    updateProgress(ceremonyStage); // 初始化進度
    
    return () => {
      // 清理 Three.js 資源
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [user]);

  // 獨立的 NFC 註冊 useEffect，只在組件掛載時執行一次
  useEffect(() => {
    // 註冊 NFC 協調器
    const systemId = 'connection-ceremony';
    console.log('📡 註冊 NFC 系統: connection-ceremony');
    
    nfcCoordinator.registerSystem(systemId, {
      priority: 2, // 高優先級（連結之橋儀式優先於報到系統）
      onCardDetected: (data) => {
        console.log('🎭 連結之橋儀式收到卡片:', data);
        // 僅接受啟動之後的真實掃描事件
        const scanTs = data.lastScanTime ? new Date(data.lastScanTime).getTime() : 0;
        if (!readerStartAtRef.current || scanTs <= readerStartAtRef.current) {
          console.log('⛔ 忽略啟動前或同時期的掃描事件', {
            scanTs,
            readerStartAt: readerStartAtRef.current,
            lastCardUid: data.lastCardUid
          });
          return;
        }
        if (data.lastCardUid) {
          setNfcCardId(data.lastCardUid);
          // 自動觸發驗證
          setTimeout(() => {
            handleNfcVerification(data.lastCardUid);
          }, 500);
        }
      },
      onStatusChange: (active) => {
        setGatewayStatus(prev => ({
          ...prev,
          hasControl: active,
          conflictDetected: !active
        }));
        
        if (active) {
          toast.success('🎭 連結之橋儀式已獲得 NFC 控制權');
        } else {
          toast.warn('⚠️ NFC 控制權被其他系統佔用');
        }
      }
    });

    // 不在載入時自動請求控制權或啟動讀卡機；改為由使用者按下「啟動自動感應」按鈕後再開始。
    // 初始化 NFC Gateway 狀態顯示
    checkGatewayStatus();
    
    return () => {
      // 只在組件真正卸載時才釋放 NFC 控制權和取消註冊
      console.log('📡 NFC 系統暫停並釋放控制權: connection-ceremony');
      try {
        const hasCtrl = (typeof nfcCoordinator.hasControl === 'function' && nfcCoordinator.hasControl(systemId))
          || (typeof nfcCoordinator.getActiveSystem === 'function' && nfcCoordinator.getActiveSystem() === systemId);
        if (hasCtrl) {
          nfcCoordinator.stopReader(systemId);
          nfcCoordinator.releaseControl(systemId);
        } else {
          console.log('⛔ 跳過停止/釋放，因為當前無 NFC 控制權');
        }
      } catch (e) {
        console.warn('清理 NFC 控制權時發生非致命錯誤，已忽略:', e?.message || e);
      }
      // 不再取消註冊，避免 StrictMode 雙重調用導致瞬間無法感應
      // nfcCoordinator.unregisterSystem(systemId);
    };
  }, []); // 空依賴數組，只在組件掛載/卸載時執行

  // 初始化影片緩存服務
  useEffect(() => {
    // 設置下載進度回調
    videoCacheService.setDownloadProgressCallback((downloaded, total, videoUrl) => {
      const progress = Math.round((downloaded / total) * 100);
      setDownloadProgress(progress);
      console.log(`影片下載進度: ${progress}% (${videoUrl})`);
    });

    // 獲取緩存統計信息
    const updateCacheStats = async () => {
      try {
        const stats = await videoCacheService.getCacheStats();
        setCacheStats(stats);
      } catch (error) {
        console.error('獲取緩存統計失敗:', error);
      }
    };

    // 預加載默認影片
    const preloadDefaultVideo = async () => {
      try {
        console.log('開始預加載默認影片...');
        await fetchWelcomeVideo();
        console.log('默認影片預加載完成');
      } catch (error) {
        console.error('預加載默認影片失敗:', error);
      }
    };

    updateCacheStats();
    preloadDefaultVideo();
    
    // 清理函數
    return () => {
      // 清理 blob URL
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, []);

  // 監聽儀式階段變化，更新進度
  useEffect(() => {
    updateProgress(ceremonyStage);
  }, [ceremonyStage]);

  // 監聽全螢幕變化
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenVideo(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (ceremonyStage === 'bridge' && bridgeData.length > 0) {
      initThreeJS();
    }
  }, [ceremonyStage, bridgeData]);

  // 獲取儀式設置
  const fetchCeremonySettings = async () => {
    try {
      const response = await fetch('/api/ceremony/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCeremonySettings(data.settings);
        setShowGuide(data.settings.enableGuide);
      }
    } catch (error) {
      console.error('獲取儀式設置失敗:', error);
      // 使用預設設置
    }
  };

  // 初始化儀式
  const initializeCeremony = async () => {
    try {
      // 獲取儀式設置
      await fetchCeremonySettings();
      
      // 獲取橋樑數據
      const bridgeResponse = await fetch('/api/users/bridge-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (bridgeResponse.ok) {
        const bridgeResult = await bridgeResponse.json();
        setBridgeData(bridgeResult.members || []);
      }

      // 獲取誓詞
      const oathResponse = await fetch('/api/ceremony/oath', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (oathResponse.ok) {
        const oathResult = await oathResponse.json();
        setOath(oathResult.oath || '我宣誓成為 GBC 的一員，致力於互助合作，共同成長，為會員搭建通往成功之路。');
      } else {
        setOath('我宣誓成為 GBC 的一員，致力於互助合作，共同成長，為會員搭建通往成功之路。');
      }

      setCeremonyStage('oath');
      
      // 延遲初始化 Three.js 場景，確保設置已更新
      setTimeout(() => {
        if (ceremonyStage === 'bridge' && bridgeData.length > 0) {
          initThreeJS();
        }
      }, 100);
    } catch (error) {
      console.error('初始化儀式失敗:', error);
      toast.error('初始化儀式失敗');
      setOath('我宣誓成為 GBC 的一員，致力於互助合作，共同成長，為會員搭建通往成功之路。');
    }
  };

  // 進入全螢幕模式
  const enterFullscreen = () => {
    if (ceremonyRef.current) {
      if (ceremonyRef.current.requestFullscreen) {
        ceremonyRef.current.requestFullscreen();
      } else if (ceremonyRef.current.webkitRequestFullscreen) {
        ceremonyRef.current.webkitRequestFullscreen();
      } else if (ceremonyRef.current.msRequestFullscreen) {
        ceremonyRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  };

  // 退出全螢幕模式
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    setIsFullscreen(false);
  };

  // 初始化 Three.js 場景
  const initThreeJS = () => {
    const settings = ceremonySettings;
    if (!canvasRef.current) return;

    // 場景設置
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // 深藍夜空背景
    sceneRef.current = scene;

    // 相機設置
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 20, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器設置
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // 根據設置創建視覺效果
    if (settings.enableParticles) {
      // 創建星空背景
      createStarField(scene);
      
      // 創建粒子系統
      createParticleSystem(scene);
    }

    // 改善的光照系統
    setupAdvancedLighting(scene);

    // 創建橋樑基礎
    createBridgeBase(scene);

    // 創建會員橋墩
    createMemberPillars(scene);

    // 添加控制器
    addControls(camera, renderer);

    // 開始渲染循環
    animate();
  };

  // 創建金色星空背景
  const createStarField = (scene) => {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = Math.random() * 300 + 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;

      // 金色系星星顏色
      const color = new THREE.Color();
      const hue = Math.random() * 0.1 + 0.12; // 金色色調範圍
      const saturation = Math.random() * 0.3 + 0.7;
      const lightness = Math.random() * 0.4 + 0.6;
      color.setHSL(hue, saturation, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 3 + 1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    // 添加星星閃爍動畫
    const animateStars = () => {
      const time = Date.now() * 0.001;
      const positions = stars.geometry.attributes.position.array;
      const colors = stars.geometry.attributes.color.array;
      
      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        // 輕微的位置變化
        positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.02;
        
        // 閃爍效果
        const intensity = (Math.sin(time * 2 + i * 0.5) + 1) * 0.5;
        colors[i3] = intensity * 1.0; // R
        colors[i3 + 1] = intensity * 0.8; // G
        colors[i3 + 2] = intensity * 0.2; // B
      }
      
      stars.geometry.attributes.position.needsUpdate = true;
      stars.geometry.attributes.color.needsUpdate = true;
    };
    
    // 將動畫函數存儲以便在主動畫循環中調用
    scene.userData.animateStars = animateStars;
  };

  // 設置高級光照系統
  const setupAdvancedLighting = (scene) => {
    // 深邃環境光 - 營造神秘氛圍
    const ambientLight = new THREE.AmbientLight(0x111122, 0.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 主要金色方向光 - 突出橋樑
    const mainLight = new THREE.DirectionalLight(0xFFD700, 1.2);
    mainLight.position.set(0, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // 橋樑主聚光燈 - 金色光束
    const bridgeSpotlight = new THREE.SpotLight(0xFFD700, 2, 80, Math.PI / 4, 0.3);
    bridgeSpotlight.position.set(0, 50, 0);
    bridgeSpotlight.target.position.set(0, 6, 0);
    bridgeSpotlight.castShadow = true;
    bridgeSpotlight.shadow.mapSize.width = 2048;
    bridgeSpotlight.shadow.mapSize.height = 2048;
    scene.add(bridgeSpotlight);
    scene.add(bridgeSpotlight.target);

    // 側面金色聚光燈 - 增強立體感
    for (let i = 0; i < 2; i++) {
      const sideSpotlight = new THREE.SpotLight(0xFFA500, 1.5, 60, Math.PI / 6, 0.4);
      sideSpotlight.position.set((i === 0 ? -30 : 30), 35, 15);
      sideSpotlight.target.position.set(0, 6, 0);
      sideSpotlight.castShadow = true;
      scene.add(sideSpotlight);
      scene.add(sideSpotlight.target);
    }

    // 橋塔頂部光源 - 閃耀效果
    for (let i = 0; i < 2; i++) {
      const towerLight = new THREE.PointLight(0xFFD700, 2, 40);
      towerLight.position.set((i === 0 ? -1 : 1) * (bridgeData.length * 2), 35, 0);
      towerLight.castShadow = true;
      scene.add(towerLight);
      
      // 添加光暈效果
      const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.6
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(towerLight.position);
      scene.add(glow);
    }

    // 動態金色光束陣列
    const goldColors = [0xFFD700, 0xFFA500, 0xFFB347, 0xDAA520, 0xB8860B];
    goldColors.forEach((color, index) => {
      const light = new THREE.PointLight(color, 0.8, 25);
      light.position.set(
        (index - 2) * 10,
        15,
        Math.sin(index) * 5
      );
      scene.add(light);
    });
  };

  // 創建金色粒子系統
  const createParticleSystem = (scene) => {
    // 主要金色粒子系統
    const particleCount = 800;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // 圍繞橋樑的初始位置
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 60 + 20;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 40 + 5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // 向上飄動的速度
      velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 1] = Math.random() * 0.08 + 0.03;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

      // 金色系顏色
      const goldVariation = Math.random();
      if (goldVariation < 0.6) {
        // 純金色
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.84;
        colors[i * 3 + 2] = 0.0;
      } else if (goldVariation < 0.8) {
        // 橙金色
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.65;
        colors[i * 3 + 2] = 0.0;
      } else {
        // 深金色
        colors[i * 3] = 0.72;
        colors[i * 3 + 1] = 0.53;
        colors[i * 3 + 2] = 0.04;
      }

      sizes[i] = Math.random() * 2 + 1;
      lifetimes[i] = Math.random() * 100;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData = { velocities, lifetimes };
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;

    // 橋樑周圍的光塵效果
    const dustCount = 300;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      // 集中在橋樑附近
      dustPositions[i * 3] = (Math.random() - 0.5) * (bridgeData.length * 8 + 30);
      dustPositions[i * 3 + 1] = Math.random() * 20 + 3;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      // 微弱的金色光塵
      const intensity = Math.random() * 0.5 + 0.3;
      dustColors[i * 3] = intensity;
      dustColors[i * 3 + 1] = intensity * 0.8;
      dustColors[i * 3 + 2] = intensity * 0.2;
      
      dustSizes[i] = Math.random() * 0.5 + 0.2;
    }

    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    const dustMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    const dustSystem = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustSystem);
    
    // 存儲光塵系統以便動畫
    scene.userData.dustSystem = dustSystem;
  };

  const createBridgeBase = (scene) => {
    // 主橋面 - 金色奢華設計
    const bridgeGeometry = new THREE.BoxGeometry(bridgeData.length * 8 + 20, 3, 12);
    const bridgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFD700, // 純金色
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      envMapIntensity: 2.0
    });
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    bridge.position.y = 6;
    bridge.receiveShadow = true;
    bridge.castShadow = true;
    scene.add(bridge);

    // 橋樑裝飾邊緣
    const edgeGeometry = new THREE.BoxGeometry(bridgeData.length * 8 + 22, 0.5, 14);
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFA500, // 橙金色
      metalness: 1.0,
      roughness: 0.05,
      clearcoat: 1.0,
      emissive: 0x332200,
      emissiveIntensity: 0.3
    });
    const edgeTop = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeTop.position.y = 7.75;
    scene.add(edgeTop);
    
    const edgeBottom = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeBottom.position.y = 4.25;
    scene.add(edgeBottom);

    // 金色支撐柱 - 斜拉橋風格
    const mainTowerHeight = 35;
    for (let i = 0; i < 2; i++) {
      const towerGeometry = new THREE.CylinderGeometry(1.5, 2, mainTowerHeight);
      const towerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFD700,
        metalness: 0.95,
        roughness: 0.05,
        clearcoat: 1.0,
        emissive: 0x221100,
        emissiveIntensity: 0.2
      });
      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.set((i === 0 ? -1 : 1) * (bridgeData.length * 2), mainTowerHeight / 2, 0);
      tower.castShadow = true;
      scene.add(tower);

      // 斜拉索
      for (let j = 0; j < bridgeData.length + 1; j++) {
        const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 
          Math.sqrt(Math.pow((j - bridgeData.length / 2) * 8 - tower.position.x, 2) + Math.pow(mainTowerHeight - 6, 2)));
        const cableMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xFFD700,
          metalness: 1.0,
          roughness: 0.1,
          emissive: 0x111100,
          emissiveIntensity: 0.1
        });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        
        const midX = ((j - bridgeData.length / 2) * 8 + tower.position.x) / 2;
        const midY = (6 + mainTowerHeight) / 2;
        cable.position.set(midX, midY, 0);
        
        const angle = Math.atan2(mainTowerHeight - 6, (j - bridgeData.length / 2) * 8 - tower.position.x);
        cable.rotation.z = angle;
        
        scene.add(cable);
      }
    }

    // 深邃黑色水面
    const waterGeometry = new THREE.PlaneGeometry(300, 300);
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x000011,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      reflectivity: 0.9,
      clearcoat: 1.0
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -15;
    water.receiveShadow = true;
    scene.add(water);

    // 添加橋樑反射效果
    const reflectionGeometry = new THREE.BoxGeometry(bridgeData.length * 8 + 20, 3, 12);
    const reflectionMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFD700,
      metalness: 0.9,
      roughness: 0.3,
      transparent: true,
      opacity: 0.3,
      clearcoat: 0.5
    });
    const reflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
    reflection.position.y = -24;
    reflection.scale.y = -1;
    scene.add(reflection);
  };

  const createMemberPillars = (scene) => {
    const pillars = [];
    
    bridgeData.forEach((member, index) => {
      // 金色橋墩主體 - 八角柱設計
      const pillarGeometry = new THREE.CylinderGeometry(2.5, 3, 12, 8);
      const pillarMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFD700,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        emissive: 0x221100,
        emissiveIntensity: 0.15
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set((index - bridgeData.length / 2) * 8, 12, 0);
      pillar.castShadow = true;
      pillar.userData = { member, index };
      scene.add(pillar);

      // 橋墩頂部裝飾
      const capGeometry = new THREE.CylinderGeometry(3.2, 2.8, 1.5, 8);
      const capMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFA500,
        metalness: 1.0,
        roughness: 0.05,
        clearcoat: 1.0,
        emissive: 0x332200,
        emissiveIntensity: 0.3
      });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.set((index - bridgeData.length / 2) * 8, 18.75, 0);
      cap.castShadow = true;
      scene.add(cap);

      // 橋墩底部基座
      const baseGeometry = new THREE.CylinderGeometry(3.5, 4, 2, 8);
      const baseMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xB8860B, // 深金色
        metalness: 0.9,
        roughness: 0.3,
        clearcoat: 0.8
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.set((index - bridgeData.length / 2) * 8, 5, 0);
      base.castShadow = true;
      scene.add(base);

      // 高級質感的會員名稱標籤
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 256;
      
      // 創建漸變背景
      const gradient = context.createLinearGradient(0, 0, 512, 256);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(0.5, '#2d2d2d');
      gradient.addColorStop(1, '#1a1a1a');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 256);
      
      // 添加金色邊框
      context.strokeStyle = '#FFD700';
      context.lineWidth = 8;
      context.strokeRect(4, 4, 504, 248);
      
      // 內部金色細邊框
      context.strokeStyle = '#FFA500';
      context.lineWidth = 2;
      context.strokeRect(12, 12, 488, 232);
      
      // 會員名稱 - 金色文字
      context.fillStyle = '#FFD700';
      context.font = 'bold 36px serif';
      context.textAlign = 'center';
      context.shadowColor = '#000000';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(member.name, 256, 120);
      
      // 專業別 - 橙金色文字
      context.fillStyle = '#FFA500';
      context.font = '24px serif';
      context.fillText(member.profession || '專業別', 256, 160);
      
      // 裝飾圖案
      context.strokeStyle = '#FFD700';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(100, 200);
      context.lineTo(412, 200);
      context.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.MeshPhysicalMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.95,
        emissive: 0x111100,
        emissiveIntensity: 0.1
      });
      const labelGeometry = new THREE.PlaneGeometry(8, 4);
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set((index - bridgeData.length / 2) * 8, 22, 0);
      scene.add(label);

      // 添加光環效果
      const haloGeometry = new THREE.RingGeometry(3.5, 4.5, 16);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.set((index - bridgeData.length / 2) * 8, 12, 0);
      halo.rotation.x = Math.PI / 2;
      scene.add(halo);

      pillars.push({ pillar, label, member, cap, base, halo });
    });

    pillarsRef.current = pillars;
  };

  const addControls = (camera, renderer) => {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      const deltaRotationQuaternion = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(
          deltaMove.y * 0.01,
          deltaMove.x * 0.01,
          0,
          'XYZ'
        ));

      camera.quaternion.multiplyQuaternions(deltaRotationQuaternion, camera.quaternion);
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (event) => {
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(scale);
    };

    const onClick = (event) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      const pillars = pillarsRef.current.map(p => p.pillar);
      const intersects = raycaster.intersectObjects(pillars);
      
      if (intersects.length > 0) {
        const selectedPillarData = intersects[0].object.userData;
        setSelectedPillar(selectedPillarData.member);
        playClickSound();
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    renderer.domElement.addEventListener('click', onClick);
  };

  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    
    // 更新金色粒子系統
    if (particleSystemRef.current) {
      const positions = particleSystemRef.current.geometry.attributes.position.array;
      const colors = particleSystemRef.current.geometry.attributes.color.array;
      const velocities = particleSystemRef.current.userData.velocities;
      const lifetimes = particleSystemRef.current.userData.lifetimes;
      
      for (let i = 0; i < positions.length; i += 3) {
        const index = i / 3;
        
        // 更新位置
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // 更新生命週期和閃爍效果
        lifetimes[index] += 1;
        const intensity = (Math.sin(time * 3 + index * 0.1) + 1) * 0.5;
        
        // 金色閃爍效果
        const baseGold = [1.0, 0.84, 0.0];
        colors[i] = baseGold[0] * intensity;
        colors[i + 1] = baseGold[1] * intensity;
        colors[i + 2] = baseGold[2] * intensity;
        
        // 重置超出邊界的粒子
        if (positions[i + 1] > 50 || lifetimes[index] > 200) {
          // 重新圍繞橋樑生成
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 60 + 20;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 1] = Math.random() * 5;
          positions[i + 2] = Math.sin(angle) * radius;
          
          // 重置速度
          velocities[i] = (Math.random() - 0.5) * 0.05;
          velocities[i + 1] = Math.random() * 0.08 + 0.03;
          velocities[i + 2] = (Math.random() - 0.5) * 0.05;
          
          lifetimes[index] = 0;
        }
      }
      
      particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
      particleSystemRef.current.geometry.attributes.color.needsUpdate = true;
    }
    
    // 更新光塵系統
    if (sceneRef.current && sceneRef.current.userData.dustSystem) {
      const dustSystem = sceneRef.current.userData.dustSystem;
      const dustPositions = dustSystem.geometry.attributes.position.array;
      const dustColors = dustSystem.geometry.attributes.color.array;
      
      for (let i = 0; i < dustPositions.length; i += 3) {
        // 緩慢飄動
        dustPositions[i] += Math.sin(time * 0.5 + i * 0.01) * 0.01;
        dustPositions[i + 1] += Math.sin(time * 0.3 + i * 0.02) * 0.005;
        dustPositions[i + 2] += Math.cos(time * 0.4 + i * 0.015) * 0.008;
        
        // 閃爍效果
        const intensity = (Math.sin(time * 2 + i * 0.05) + 1) * 0.25 + 0.3;
        dustColors[i] = intensity;
        dustColors[i + 1] = intensity * 0.8;
        dustColors[i + 2] = intensity * 0.2;
      }
      
      dustSystem.geometry.attributes.position.needsUpdate = true;
      dustSystem.geometry.attributes.color.needsUpdate = true;
    }
    
    // 星空閃爍動畫
    if (sceneRef.current && sceneRef.current.userData.animateStars) {
      sceneRef.current.userData.animateStars();
    }
    
    // 動態光照效果
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.3 + Math.sin(time * 0.5) * 0.1;
    }
    
    // 動態金色光束效果
    if (sceneRef.current && sceneRef.current.userData.dynamicLights) {
      sceneRef.current.userData.dynamicLights.forEach((light, index) => {
        light.intensity = 0.8 + Math.sin(time * 2 + index * 0.5) * 0.3;
        light.position.y = 25 + Math.sin(time + index) * 2;
      });
    }
    
    if (rendererRef.current && cameraRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  // ==================== 專業運鏡動畫系統 ====================
  
  // 創建電影級攝影機動畫序列
  const createCameraAnimationSequence = (newMemberName) => {
    const sequences = [
      {
        name: 'opening_establishing_shot',
        duration: 4000,
        description: '電影級開場建立鏡頭',
        keyframes: [
          { time: 0, position: { x: 0, y: 80, z: 120 }, target: { x: 0, y: 0, z: 0 }, fov: 85 },
          { time: 0.3, position: { x: 15, y: 70, z: 100 }, target: { x: 0, y: 5, z: 0 }, fov: 80 },
          { time: 0.7, position: { x: -10, y: 60, z: 80 }, target: { x: 0, y: 8, z: 0 }, fov: 75 },
          { time: 1, position: { x: 0, y: 50, z: 70 }, target: { x: 0, y: 10, z: 0 }, fov: 70 }
        ],
        effects: {
          particleIntensity: 0.3,
          lightIntensity: 0.8,
          fogDensity: 0.1
        }
      },
      {
        name: 'dramatic_descent',
        duration: 5000,
        description: '戲劇性俯衝鏡頭',
        keyframes: [
          { time: 0, position: { x: 0, y: 50, z: 70 }, target: { x: 0, y: 10, z: 0 }, fov: 70 },
          { time: 0.2, position: { x: -25, y: 45, z: 55 }, target: { x: 0, y: 12, z: 0 }, fov: 68 },
          { time: 0.5, position: { x: -15, y: 35, z: 45 }, target: { x: 0, y: 15, z: 0 }, fov: 65 },
          { time: 0.8, position: { x: 10, y: 30, z: 40 }, target: { x: 0, y: 12, z: 0 }, fov: 62 },
          { time: 1, position: { x: 0, y: 25, z: 35 }, target: { x: 0, y: 12, z: 0 }, fov: 60 }
        ],
        effects: {
          particleIntensity: 0.5,
          lightIntensity: 1.0,
          fogDensity: 0.05
        }
      },
      {
        name: 'epic_bridge_orbit',
        duration: 8000,
        description: '史詩級橋樑環繞鏡頭',
        keyframes: [
          { time: 0, position: { x: 0, y: 25, z: 35 }, target: { x: 0, y: 12, z: 0 }, fov: 60 },
          { time: 0.15, position: { x: 35, y: 30, z: 25 }, target: { x: 0, y: 10, z: 0 }, fov: 65 },
          { time: 0.3, position: { x: 40, y: 35, z: 0 }, target: { x: 0, y: 8, z: 0 }, fov: 70 },
          { time: 0.45, position: { x: 35, y: 40, z: -25 }, target: { x: 0, y: 12, z: 0 }, fov: 68 },
          { time: 0.6, position: { x: 0, y: 45, z: -35 }, target: { x: 0, y: 10, z: 0 }, fov: 65 },
          { time: 0.75, position: { x: -35, y: 40, z: -25 }, target: { x: 0, y: 8, z: 0 }, fov: 68 },
          { time: 0.9, position: { x: -40, y: 35, z: 0 }, target: { x: 0, y: 12, z: 0 }, fov: 70 },
          { time: 1, position: { x: -35, y: 30, z: 25 }, target: { x: 0, y: 10, z: 0 }, fov: 65 }
        ],
        effects: {
          particleIntensity: 0.8,
          lightIntensity: 1.2,
          fogDensity: 0.02
        }
      },
      {
        name: 'member_spotlight_sequence',
        duration: 7000,
        description: '新會員聚光燈特寫序列',
        keyframes: [
          { time: 0, position: { x: -35, y: 30, z: 25 }, target: { x: 0, y: 10, z: 0 }, fov: 65 },
          { time: 0.2, position: { x: -25, y: 25, z: 30 }, target: { x: 0, y: 15, z: 0 }, fov: 55 },
          { time: 0.4, position: { x: -15, y: 22, z: 28 }, target: { x: 0, y: 18, z: 0 }, fov: 50 },
          { time: 0.6, position: { x: -5, y: 20, z: 25 }, target: { x: 0, y: 20, z: 0 }, fov: 45 },
          { time: 0.8, position: { x: 0, y: 18, z: 22 }, target: { x: 0, y: 22, z: 0 }, fov: 42 },
          { time: 1, position: { x: 0, y: 16, z: 18 }, target: { x: 0, y: 24, z: 0 }, fov: 38 }
        ],
        effects: {
          particleIntensity: 1.0,
          lightIntensity: 1.5,
          fogDensity: 0.01,
          spotlight: true
        }
      },
      {
        name: 'bridge_completion_reveal',
        duration: 6000,
        description: '橋樑完成揭示鏡頭',
        keyframes: [
          { time: 0, position: { x: 0, y: 16, z: 18 }, target: { x: 0, y: 24, z: 0 }, fov: 38 },
          { time: 0.2, position: { x: 5, y: 20, z: 25 }, target: { x: 0, y: 20, z: 0 }, fov: 45 },
          { time: 0.4, position: { x: 0, y: 25, z: 35 }, target: { x: 0, y: 15, z: 0 }, fov: 55 },
          { time: 0.6, position: { x: 0, y: 30, z: 45 }, target: { x: 0, y: 10, z: 0 }, fov: 65 },
          { time: 0.8, position: { x: 0, y: 40, z: 55 }, target: { x: 0, y: 8, z: 0 }, fov: 75 },
          { time: 1, position: { x: 0, y: 35, z: 50 }, target: { x: 0, y: 10, z: 0 }, fov: 70 }
        ],
        effects: {
          particleIntensity: 1.2,
          lightIntensity: 1.8,
          fogDensity: 0.03,
          celebration: true
        }
      },
      {
        name: 'final_hero_shot',
        duration: 5000,
        description: '最終英雄鏡頭定格',
        keyframes: [
          { time: 0, position: { x: 0, y: 35, z: 50 }, target: { x: 0, y: 10, z: 0 }, fov: 70 },
          { time: 0.3, position: { x: 0, y: 32, z: 45 }, target: { x: 0, y: 12, z: 0 }, fov: 68 },
          { time: 0.7, position: { x: 0, y: 30, z: 42 }, target: { x: 0, y: 14, z: 0 }, fov: 66 },
          { time: 1, position: { x: 0, y: 28, z: 40 }, target: { x: 0, y: 15, z: 0 }, fov: 65 }
        ],
        effects: {
          particleIntensity: 0.6,
          lightIntensity: 1.0,
          fogDensity: 0.02,
          finalFrame: true
        }
      }
    ];
    
    return sequences;
  };

  // 執行攝影機動畫
  const playCameraAnimation = (sequences) => {
    if (!cameraRef.current || !sequences || sequences.length === 0) return;
    
    setCameraAnimation(prev => ({ ...prev, isPlaying: true, progress: 0 }));
    animationStartTimeRef.current = Date.now();
    animationTimelineRef.current = sequences;
    
    let currentSequenceIndex = 0;
    let sequenceStartTime = Date.now();
    
    const animateCamera = () => {
      if (currentSequenceIndex >= sequences.length) {
        // 動畫完成
        setCameraAnimation(prev => ({ 
          ...prev, 
          isPlaying: false, 
          progress: 100,
          currentSequence: null 
        }));
        return;
      }
      
      const currentSequence = sequences[currentSequenceIndex];
      const elapsed = Date.now() - sequenceStartTime;
      const progress = Math.min(elapsed / currentSequence.duration, 1);
      
      // 更新當前序列信息
      setCameraAnimation(prev => ({ 
        ...prev, 
        currentSequence: currentSequence.name,
        progress: ((currentSequenceIndex + progress) / sequences.length) * 100
      }));
      
      // 計算當前關鍵幀之間的插值
      const keyframes = currentSequence.keyframes;
      let currentKeyframe = null;
      let nextKeyframe = null;
      let keyframeProgress = 0;
      
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
          currentKeyframe = keyframes[i];
          nextKeyframe = keyframes[i + 1];
          const keyframeDuration = nextKeyframe.time - currentKeyframe.time;
          keyframeProgress = keyframeDuration > 0 ? 
            (progress - currentKeyframe.time) / keyframeDuration : 0;
          break;
        }
      }
      
      if (!currentKeyframe || !nextKeyframe) {
        currentKeyframe = keyframes[keyframes.length - 1];
        nextKeyframe = currentKeyframe;
        keyframeProgress = 1;
      }
      
      // 使用緩動函數進行平滑插值
      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      const smoothProgress = easeInOutCubic(keyframeProgress);
      
      // 插值計算攝影機位置
      const position = {
        x: currentKeyframe.position.x + (nextKeyframe.position.x - currentKeyframe.position.x) * smoothProgress,
        y: currentKeyframe.position.y + (nextKeyframe.position.y - currentKeyframe.position.y) * smoothProgress,
        z: currentKeyframe.position.z + (nextKeyframe.position.z - currentKeyframe.position.z) * smoothProgress
      };
      
      const target = {
        x: currentKeyframe.target.x + (nextKeyframe.target.x - currentKeyframe.target.x) * smoothProgress,
        y: currentKeyframe.target.y + (nextKeyframe.target.y - currentKeyframe.target.y) * smoothProgress,
        z: currentKeyframe.target.z + (nextKeyframe.target.z - currentKeyframe.target.z) * smoothProgress
      };
      
      const fov = currentKeyframe.fov + (nextKeyframe.fov - currentKeyframe.fov) * smoothProgress;
      
      // 應用到攝影機
       cameraRef.current.position.set(position.x, position.y, position.z);
       cameraRef.current.lookAt(target.x, target.y, target.z);
       cameraRef.current.fov = fov;
       cameraRef.current.updateProjectionMatrix();
       
       // 應用動態視覺效果
       if (currentSequence.effects) {
         applySequenceEffects(currentSequence.effects, smoothProgress);
       }
      
      // 檢查當前序列是否完成
      if (progress >= 1) {
        currentSequenceIndex++;
        sequenceStartTime = Date.now();
      }
      
      // 繼續動畫
      cameraAnimationRef.current = requestAnimationFrame(animateCamera);
    };
    
    // 開始動畫
    cameraAnimationRef.current = requestAnimationFrame(animateCamera);
  };

  // 停止攝影機動畫
  const stopCameraAnimation = () => {
    if (cameraAnimationRef.current) {
      cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
    setCameraAnimation(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentSequence: null,
      progress: 0 
    }));
  };

  // 重置攝影機到初始位置
  const resetCameraPosition = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 20, 30);
      cameraRef.current.lookAt(0, 0, 0);
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  // 應用序列視覺效果
  const applySequenceEffects = (effects, progress) => {
    if (!sceneRef.current) return;
    
    // 調整粒子系統強度
    if (effects.particleIntensity !== undefined && goldParticlesRef.current) {
      const targetIntensity = effects.particleIntensity;
      goldParticlesRef.current.material.opacity = targetIntensity * 0.8;
      
      // 調整粒子數量和速度
      const particles = goldParticlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < particles.length; i += 3) {
        const speedMultiplier = targetIntensity * 2;
        particles[i + 1] += speedMultiplier * 0.01; // Y軸移動
      }
      goldParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // 調整光照強度
    if (effects.lightIntensity !== undefined) {
      const targetIntensity = effects.lightIntensity;
      
      // 調整主方向光
      if (sceneRef.current.children) {
        sceneRef.current.children.forEach(child => {
          if (child.type === 'DirectionalLight') {
            child.intensity = targetIntensity * 0.8;
          } else if (child.type === 'SpotLight') {
            child.intensity = targetIntensity * 1.2;
          } else if (child.type === 'AmbientLight') {
            child.intensity = targetIntensity * 0.3;
          }
        });
      }
    }
    
    // 特殊效果處理
    if (effects.spotlight && progress > 0.5) {
      // 聚光燈效果 - 增強新會員區域的光照
      createMemberSpotlight();
    }
    
    if (effects.celebration && progress > 0.7) {
      // 慶祝效果 - 觸發粒子爆發
      triggerCelebrationParticles();
    }
    
    if (effects.finalFrame && progress > 0.9) {
      // 最終定格效果 - 優化會員姓名顯示
      enhanceMemberNameDisplay();
    }
  };

  // 創建會員聚光燈
  const createMemberSpotlight = () => {
    if (!sceneRef.current || !newMember) return;
    
    // 移除舊的聚光燈
    const existingSpotlight = sceneRef.current.getObjectByName('memberSpotlight');
    if (existingSpotlight) {
      sceneRef.current.remove(existingSpotlight);
    }
    
    // 創建新的聚光燈
    const spotlight = new THREE.SpotLight(0xffd700, 2, 100, Math.PI / 6, 0.5);
    spotlight.name = 'memberSpotlight';
    spotlight.position.set(0, 40, 20);
    spotlight.target.position.set(0, 20, 0);
    spotlight.castShadow = true;
    
    sceneRef.current.add(spotlight);
    sceneRef.current.add(spotlight.target);
  };

  // 觸發慶祝粒子效果
  const triggerCelebrationParticles = () => {
    if (!sceneRef.current) return;
    
    // 創建慶祝粒子系統
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // 從橋樑中心向外爆發
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 30 + 10;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.random() * 20 + 15;
      positions[i3 + 2] = Math.sin(angle) * radius;
      
      // 金色系顏色
      colors[i3] = 1.0; // R
      colors[i3 + 1] = 0.8 + Math.random() * 0.2; // G
      colors[i3 + 2] = 0.0; // B
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const celebrationParticles = new THREE.Points(particles, material);
    celebrationParticles.name = 'celebrationParticles';
    sceneRef.current.add(celebrationParticles);
    
    // 動畫粒子消散
    setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.remove(celebrationParticles);
      }
    }, 3000);
  };

  // 增強會員姓名顯示
  const enhanceMemberNameDisplay = () => {
    if (!newMember || !sceneRef.current) return;
    
    // 找到新會員的標籤
    const memberLabels = sceneRef.current.children.filter(child => 
      child.geometry && child.geometry.type === 'PlaneGeometry' && 
      child.material && child.material.map
    );
    
    // 找到最新添加的會員標籤（通常是最後一個）
    const newMemberLabel = memberLabels[memberLabels.length - 1];
    
    if (newMemberLabel) {
      // 創建增強版的會員姓名標籤
      const enhancedCanvas = document.createElement('canvas');
      const context = enhancedCanvas.getContext('2d');
      enhancedCanvas.width = 1024; // 更高解析度
      enhancedCanvas.height = 512;
      
      // 創建豪華漸變背景
      const gradient = context.createRadialGradient(512, 256, 0, 512, 256, 400);
      gradient.addColorStop(0, '#2a2a2a');
      gradient.addColorStop(0.3, '#1a1a1a');
      gradient.addColorStop(0.7, '#0a0a0a');
      gradient.addColorStop(1, '#000000');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1024, 512);
      
      // 多層金色邊框效果
      const borderColors = ['#FFD700', '#FFA500', '#FF8C00'];
      const borderWidths = [12, 8, 4];
      
      borderColors.forEach((color, i) => {
        context.strokeStyle = color;
        context.lineWidth = borderWidths[i];
        const offset = i * 6 + 8;
        context.strokeRect(offset, offset, 1024 - offset * 2, 512 - offset * 2);
      });
      
      // 添加發光效果
      context.shadowColor = '#FFD700';
      context.shadowBlur = 20;
      
      // 會員名稱 - 超大金色文字
      context.fillStyle = '#FFD700';
      context.font = 'bold 72px serif';
      context.textAlign = 'center';
      context.fillText(newMember.name, 512, 240);
      
      // 重複繪製以增強發光效果
      context.shadowBlur = 40;
      context.fillText(newMember.name, 512, 240);
      
      // 專業別 - 橙金色文字
      context.shadowBlur = 15;
      context.fillStyle = '#FFA500';
      context.font = 'bold 36px serif';
      context.fillText(newMember.profession || '專業別', 512, 320);
      
      // 裝飾圖案 - 更複雜的設計
      context.shadowBlur = 10;
      context.strokeStyle = '#FFD700';
      context.lineWidth = 4;
      
      // 上裝飾線
      context.beginPath();
      context.moveTo(200, 380);
      context.lineTo(824, 380);
      context.stroke();
      
      // 下裝飾線
      context.beginPath();
      context.moveTo(200, 400);
      context.lineTo(824, 400);
      context.stroke();
      
      // 側邊裝飾
      for (let i = 0; i < 5; i++) {
        const x = 150 + i * 150;
        context.beginPath();
        context.arc(x, 390, 8, 0, Math.PI * 2);
        context.fill();
      }
      
      // 更新材質
      const enhancedTexture = new THREE.CanvasTexture(enhancedCanvas);
      enhancedTexture.needsUpdate = true;
      
      const enhancedMaterial = new THREE.MeshPhysicalMaterial({
        map: enhancedTexture,
        transparent: true,
        opacity: 1.0,
        emissive: 0x222200,
        emissiveIntensity: 0.3,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });
      
      // 更新標籤幾何體為更大尺寸
      const enhancedGeometry = new THREE.PlaneGeometry(12, 6);
      newMemberLabel.geometry.dispose();
      newMemberLabel.material.dispose();
      newMemberLabel.geometry = enhancedGeometry;
      newMemberLabel.material = enhancedMaterial;
      
      // 添加脈衝動畫效果
      let pulseDirection = 1;
      let pulseScale = 1;
      
      const pulseAnimation = () => {
        if (!newMemberLabel.parent) return; // 如果標籤已被移除，停止動畫
        
        pulseScale += pulseDirection * 0.005;
        if (pulseScale > 1.1) {
          pulseDirection = -1;
        } else if (pulseScale < 0.95) {
          pulseDirection = 1;
        }
        
        newMemberLabel.scale.set(pulseScale, pulseScale, 1);
        requestAnimationFrame(pulseAnimation);
      };
      
      // 開始脈衝動畫
      pulseAnimation();
      
      // 添加額外的光環效果
      const enhancedHaloGeometry = new THREE.RingGeometry(5, 7, 32);
      const enhancedHaloMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      
      const enhancedHalo = new THREE.Mesh(enhancedHaloGeometry, enhancedHaloMaterial);
      enhancedHalo.position.copy(newMemberLabel.position);
      enhancedHalo.position.y -= 10;
      enhancedHalo.name = 'enhancedHalo';
      
      // 移除舊的光環
      const oldHalo = sceneRef.current.getObjectByName('enhancedHalo');
      if (oldHalo) {
        sceneRef.current.remove(oldHalo);
      }
      
      sceneRef.current.add(enhancedHalo);
      
      // 光環旋轉動畫
      const rotateHalo = () => {
        if (!enhancedHalo.parent) return;
        enhancedHalo.rotation.z += 0.01;
        requestAnimationFrame(rotateHalo);
      };
      
      rotateHalo();
    }
  };

  // ==================== 專業運鏡動畫系統結束 ====================

  // 改善的音效系統
  const playClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('音效播放失敗:', error);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 播放和弦音效 (C-E-G)
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2); // E5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.4); // G5

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      console.warn('音效播放失敗:', error);
    }
  };

  // 播放錯誤音效
  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('音效播放失敗:', error);
    }
  };

  // ==================== 影片播放系統開始 ====================
  
  // 獲取默認歡迎影片
  const fetchWelcomeVideo = async () => {
    try {
      setIsVideoLoading(true);
      setVideoError(null);
      setIsDownloading(false);
      setDownloadProgress(0);
      
      const response = await fetch('/api/video-management/default-video', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('無法獲取歡迎影片');
      }
      
      const data = await response.json();
      
      if (data.success && data.video) {
        setVideoData(data.video);
        
        // 預加載影片到緩存
        if (data.video.file_url) {
          try {
            setIsDownloading(true);
            const { blobUrl } = await preloadVideo(data.video.file_url);
            setVideoBlobUrl(blobUrl);
            console.log('影片預加載完成，blob URL:', blobUrl);
          } catch (preloadError) {
            console.error('影片預加載失敗:', preloadError);
            // 預加載失敗時仍然可以使用原始 URL
          } finally {
            setIsDownloading(false);
          }
        }
        
        return data.video;
      } else {
        throw new Error(data.message || '沒有設置默認歡迎影片');
      }
    } catch (error) {
      console.error('獲取歡迎影片失敗:', error);
      setVideoError(error.message);
      toast.error('獲取歡迎影片失敗: ' + error.message);
      return null;
    } finally {
      setIsVideoLoading(false);
    }
  };
  
  // 觸發 NFC 影片播放
  const triggerNfcVideoPlay = async (memberData) => {
    try {
      const response = await fetch('/api/nfc-trigger/play-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nfc_card_id: memberData.nfc_card_id,
          member_id: memberData.id
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.video) {
        setVideoData(result.video);
        return result.video;
      } else {
        // 如果沒有特定影片，使用默認影片
        return await fetchWelcomeVideo();
      }
    } catch (error) {
      console.error('觸發 NFC 影片播放失敗:', error);
      // 降級到默認影片
      return await fetchWelcomeVideo();
    }
  };
  
  // 處理影片開始播放
  const handleVideoPlay = () => {
    // 進入全螢幕模式
    setIsFullscreenVideo(true);

    // 播放前重置尊榮特效狀態
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    setPrestigeOverlayVisible(false);
    setPrestigeOverlayShown(false);
    
    // 嘗試進入瀏覽器全螢幕
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen().catch(err => {
        console.log('無法進入全螢幕模式:', err);
      });
    }
  };

  // 在影片時間更新時，於 10 秒觸發尊榮特效（僅 NFC 觸發的儀式影片）
  const showPrestigeOverlay = () => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    setPrestigeOverlayVisible(true);
    setPrestigeOverlayShown(true);
    overlayTimeoutRef.current = setTimeout(() => {
      setPrestigeOverlayVisible(false);
      overlayTimeoutRef.current = null;
    }, 3000);
  };

  const handleVideoTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    // 僅在影片階段、存在新會員資訊、且尚未顯示過時觸發
    if (ceremonyStage === 'video' && newMember && !prestigeOverlayShown && v.currentTime >= 10) {
      showPrestigeOverlay();
    }
  };
  
  // 處理影片播放結束
  const handleVideoEnded = () => {
    // 退出全螢幕模式
    setIsFullscreenVideo(false);
    
    // 記錄播放完成
    if (videoData && newMember) {
      fetch('/api/nfc-trigger/play-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          video_id: videoData.id,
          member_id: newMember.id,
          nfc_card_id: newMember.nfc_card_id
        })
      }).catch(error => {
        console.error('記錄播放完成失敗:', error);
      });
    }
    
    // 轉換到歡迎界面，跳過橋樑場景
    setCeremonyStage('welcome');
    setShowWelcomeMessage(true);
    
    // 3秒後自動進入完成階段
    setTimeout(() => {
      transitionToStage('completed');
    }, 3000);
  };
  
  // 預載影片資源 - 使用緩存服務
  const preloadVideo = async (videoUrl) => {
    try {
      console.log('開始預載影片:', videoUrl);
      
      // 首先檢查緩存中是否已有影片
      let videoBlob = await videoCacheService.getVideoFromCache(videoUrl);
      
      if (!videoBlob) {
        // 如果緩存中沒有，則預加載影片
        console.log('緩存中未找到影片，開始下載...');
        videoBlob = await videoCacheService.preloadVideo(videoUrl, {
          priority: 'high',
          chunkSize: 2 * 1024 * 1024 // 2MB 分塊
        });
      } else {
        console.log('從緩存中獲取影片成功');
      }
      
      // 創建 video 元素並設置 blob URL
      const video = document.createElement('video');
      const blobUrl = URL.createObjectURL(videoBlob);
      video.src = blobUrl;
      video.preload = 'auto';
      
      return new Promise((resolve, reject) => {
        video.addEventListener('canplaythrough', () => {
          console.log('影片預載完成');
          resolve({ video, blobUrl });
        });
        
        video.addEventListener('error', (error) => {
          console.error('影片預載失敗:', error);
          URL.revokeObjectURL(blobUrl);
          reject(error);
        });
        
        // 10秒超時
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('影片預載超時'));
        }, 10000);
      });
      
    } catch (error) {
      console.error('影片預載過程中發生錯誤:', error);
      throw error;
    }
  };
  
  // ==================== 影片播放系統結束 ====================

  // 豪華場景過渡音效
  const playTransitionSound = () => {
    if (!ceremonySettings.enableSound) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 創建多層音效，營造豪華感
      const createTone = (frequency, startTime, duration, volume = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };
      
      // 豪華和弦進行：C大調 - F大調 - G大調 - C大調
      // 第一個和弦 (C大調)
      createTone(261.63, 0, 0.8, 0.08);    // C4
      createTone(329.63, 0, 0.8, 0.06);    // E4
      createTone(392.00, 0, 0.8, 0.05);    // G4
      
      // 第二個和弦 (F大調)
      createTone(349.23, 0.3, 0.8, 0.08);  // F4
      createTone(440.00, 0.3, 0.8, 0.06);  // A4
      createTone(523.25, 0.3, 0.8, 0.05);  // C5
      
      // 第三個和弦 (G大調)
      createTone(392.00, 0.6, 0.8, 0.08);  // G4
      createTone(493.88, 0.6, 0.8, 0.06);  // B4
      createTone(587.33, 0.6, 0.8, 0.05);  // D5
      
      // 最終解決 (C大調，更高音域)
      createTone(523.25, 0.9, 1.2, 0.1);   // C5
      createTone(659.25, 0.9, 1.2, 0.08);  // E5
      createTone(783.99, 0.9, 1.2, 0.06);  // G5
    } catch (error) {
      console.warn('過渡音效播放失敗:', error);
    }
  };

  // 慶祝音效（用於儀式完成）
  const playCelebrationSound = () => {
    if (!ceremonySettings.enableSound) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 創建上升音階效果
      const frequencies = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C5到C6
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const startTime = index * 0.1;
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + 0.4);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + 0.4);
      });
      
      // 添加最終的和弦爆發
      setTimeout(() => {
        [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 1.5);
        });
      }, 800);
    } catch (error) {
      console.warn('慶祝音效播放失敗:', error);
    }
  };

  const triggerNewPillarAnimation = (member) => {
    console.log('觸發新基石動畫:', member);
    
    if (!sceneRef.current || !pillarsRef.current) return;
    
    // 創建光束連接效果
    const createLightBeam = () => {
      const newPillarIndex = pillarsRef.current.length - 1;
      if (newPillarIndex < 1) return;
      
      // 連接到前一個柱子的光束
      const startPos = pillarsRef.current[newPillarIndex - 1].pillar.position;
      const endPos = pillarsRef.current[newPillarIndex].pillar.position;
      
      const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, startPos.distanceTo(endPos));
      const beamMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd700, 
        transparent: true, 
        opacity: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 0.5
      });
      
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.copy(startPos).lerp(endPos, 0.5);
      beam.lookAt(endPos);
      beam.rotateX(Math.PI / 2);
      
      sceneRef.current.add(beam);
      
      // 光束動畫
      let opacity = 0;
      const animateBeam = () => {
        opacity += 0.02;
        beam.material.opacity = Math.sin(opacity) * 0.8;
        beam.material.emissiveIntensity = Math.sin(opacity * 2) * 0.8 + 0.2;
        
        if (opacity < Math.PI * 4) {
          requestAnimationFrame(animateBeam);
        } else {
          sceneRef.current.remove(beam);
        }
      };
      animateBeam();
    };
    
    // 創建粒子爆發效果
    const createParticleBurst = () => {
      if (!pillarsRef.current.length) return;
      
      const lastPillar = pillarsRef.current[pillarsRef.current.length - 1];
      const burstGeometry = new THREE.BufferGeometry();
      const burstCount = 100;
      const positions = new Float32Array(burstCount * 3);
      const velocities = new Float32Array(burstCount * 3);
      const colors = new Float32Array(burstCount * 3);
      
      for (let i = 0; i < burstCount; i++) {
        positions[i * 3] = lastPillar.pillar.position.x;
        positions[i * 3 + 1] = lastPillar.pillar.position.y;
        positions[i * 3 + 2] = lastPillar.pillar.position.z;
        
        velocities[i * 3] = (Math.random() - 0.5) * 2;
        velocities[i * 3 + 1] = Math.random() * 2 + 1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        
        const color = new THREE.Color();
        color.setHSL(0.15, 1, 0.5 + Math.random() * 0.5); // 金色系
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      burstGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const burstMaterial = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      
      const burst = new THREE.Points(burstGeometry, burstMaterial);
      burst.userData = { velocities, life: 0 };
      sceneRef.current.add(burst);
      
      // 粒子爆發動畫
      const animateBurst = () => {
        const positions = burst.geometry.attributes.position.array;
        const velocities = burst.userData.velocities;
        burst.userData.life += 0.02;
        
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i];
          positions[i + 1] += velocities[i + 1];
          positions[i + 2] += velocities[i + 2];
          
          velocities[i + 1] -= 0.02; // 重力效果
        }
        
        burst.geometry.attributes.position.needsUpdate = true;
        burst.material.opacity = Math.max(0, 1 - burst.userData.life * 2);
        
        if (burst.userData.life < 2) {
          requestAnimationFrame(animateBurst);
        } else {
          sceneRef.current.remove(burst);
        }
      };
      animateBurst();
    };
    
    // 執行動畫序列
    setTimeout(createLightBeam, 500);
    setTimeout(createParticleBurst, 1000);
    
    // 完成儀式
    setTimeout(() => {
      setCeremonyStage('completed');
    }, 5000);
  };

  // NFC Gateway 功能
  // 檢查 NFC Gateway Service 狀態
  const checkGatewayStatus = async () => {
    try {
      setConnecting(true);
      setNfcError(null);
      
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/status`);
      
      // 檢查響應狀態
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 檢查響應內容類型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Gateway 服務返回了非 JSON 響應，請確認 NFC Gateway 服務正在運行');
      }
      
      const data = await response.json();
      console.log('Gateway 狀態:', data);
      
      setGatewayStatus({
        ...data,
        success: data.status === 'running',
        nfcAvailable: data.readerConnected !== undefined,
        isActive: data.nfcActive
      });
      setIsNfcReading(data.nfcActive);
      
      // NFC 輪詢現在由協調器處理，無需手動啟動
      if (data.nfcActive && data.readerConnected) {
        console.log('NFC 已啟動，協調器將自動處理輪詢...');
      }
      
      setConnecting(false);
      return true;
    } catch (error) {
      console.error('檢查 Gateway 狀態失敗:', error);
      
      let errorMessage = '無法連接到本地 NFC Gateway Service';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'NFC Gateway 服務未運行，請先啟動 Gateway 服務';
      } else if (error.message.includes('non-JSON')) {
        errorMessage = error.message;
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Gateway 服務錯誤: ${error.message}`;
      }
      
      setGatewayStatus({
        success: false,
        message: errorMessage
      });
      setNfcError(errorMessage);
      setConnecting(false);
      return false;
    }
  };
  
  // 啟動 NFC 讀卡機
  const startNFCReading = async () => {
    setNfcError(null);
    
    // 首先請求 NFC 控制權
    const systemId = 'connection-ceremony';
    const hasControl = await nfcCoordinator.requestControl(systemId);
    
    if (!hasControl) {
      const activeSystem = nfcCoordinator.getActiveSystem();
      setNfcError(`NFC 控制權被 ${activeSystem} 佔用，請先停止其他 NFC 系統`);
      toast.error(`NFC 控制權被 ${activeSystem} 佔用`);
      return;
    }
    
    try {
      const success = await nfcCoordinator.startReader(systemId);
      
      if (success) {
        // 設定啟動時間門檻（只接受此時間之後的掃描）
        readerStartAtRef.current = Date.now();
        setIsNfcReading(true);
        setNfcSuccess('NFC 讀卡機啟動成功！請將 NFC 卡片靠近讀卡機');
        toast.success('🎭 連結之橋儀式 NFC 自動感應已啟動');
        setTimeout(() => setNfcSuccess(null), 5000);
      } else {
        setNfcError('NFC 讀卡機啟動失敗');
        toast.error('NFC 讀卡機啟動失敗');
      }
    } catch (error) {
      console.error('啟動 NFC 讀卡機失敗:', error);
      
      let errorMessage = '無法連接到本地 NFC Gateway Service';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'NFC Gateway 服務未運行，請先啟動 Gateway 服務';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Gateway 服務錯誤: ${error.message}`;
      }
      
      setNfcError(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  // 停止 NFC 讀卡機
  const stopNFCReading = async () => {
    const systemId = 'connection-ceremony';
    
    // 若當前無控制權，視為已停止，避免不必要的錯誤提示
    try {
      const hasCtrl = (typeof nfcCoordinator.hasControl === 'function' && nfcCoordinator.hasControl(systemId))
        || (typeof nfcCoordinator.getActiveSystem === 'function' && nfcCoordinator.getActiveSystem() === systemId);
      if (!hasCtrl) {
        setIsNfcReading(false);
        setNfcSuccess('NFC 讀卡機已停止');
        toast.info('🎭 連結之橋儀式 NFC 自動感應已停止（無控制權，跳過停止）');
        setTimeout(() => setNfcSuccess(null), 3000);
        // 重置啟動時間門檻
        readerStartAtRef.current = 0;
        return;
      }
    } catch (_) {
      // 檢查控制權時出現例外，忽略並嘗試進行停止
    }
    
    try {
      const success = await nfcCoordinator.stopReader(systemId);
      
      if (success) {
        setIsNfcReading(false);
        setNfcSuccess('NFC 讀卡機已停止');
        toast.info('🎭 連結之橋儀式 NFC 自動感應已停止');
        setTimeout(() => setNfcSuccess(null), 3000);
        // 重置啟動時間門檻
        readerStartAtRef.current = 0;
        
        // 注意：不釋放控制權，保持註冊狀態以便重新啟動
        // nfcCoordinator.releaseControl(systemId);
      } else {
        setNfcError('NFC 讀卡機停止失敗');
      }
    } catch (error) {
      console.error('停止 NFC 讀卡機失敗:', error);
      
      let errorMessage = '無法連接到本地 NFC Gateway Service';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'NFC Gateway 服務未運行';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Gateway 服務錯誤: ${error.message}`;
      }
      
      setNfcError(errorMessage);
    }
  };
  
  // NFC 輪詢已由協調器處理，移除舊的輪詢函數

  // 改善的 NFC 驗證處理
  const handleNfcVerification = async (cardId = null) => {
    const targetCardId = cardId || nfcCardId.trim();
    
    if (!targetCardId) {
      toast.error('請輸入 NFC 卡片 ID');
      playErrorSound();
      // 自動聚焦到輸入框
      if (nfcInputRef.current) {
        nfcInputRef.current.focus();
      }
      return;
    }

    try {
      const response = await fetch('/api/ceremony/activate-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nfc_card_id: targetCardId })
      });

      const result = await response.json();

      if (result.success) {
        setNewMember(result.member);
        toast.success(`歡迎 ${result.member.name} 加入連結之橋！`);
        playSuccessSound();
        
        // 清空輸入框
        setNfcCardId('');
        
        // 觸發 NFC 影片播放
        const startVideoPlayback = async () => {
          try {
            const video = await triggerNfcVideoPlay(result.member);
            if (video) {
              // 轉換到影片播放階段
              setCeremonyStage('video');
              
              // 預載影片以確保流暢播放
              if (video.file_url) {
                try {
                  await preloadVideo(video.file_url);
                } catch (preloadError) {
                  console.warn('影片預載失敗，但仍會嘗試播放:', preloadError);
                }
              }
            } else {
              // 如果沒有影片，直接跳轉到歡迎界面
              setCeremonyStage('welcome');
              setShowWelcomeMessage(true);
              
              // 3秒後自動進入橋樑場景
              setTimeout(() => {
                transitionToStage('bridge');
                
                // 延遲觸發動畫，確保場景已完全載入
                setTimeout(() => {
                  // 觸發新基石奠定動畫
                  triggerNewPillarAnimation(result.member);
                  
                  // 自動觸發專業運鏡動畫序列
                  setTimeout(() => {
                    const animationSequences = createCameraAnimationSequence(result.member.name);
                    playCameraAnimation(animationSequences);
                    
                    // 設置自動播放狀態
                    setCameraAnimation(prev => ({ 
                      ...prev, 
                      autoPlay: true,
                      isPlaying: true 
                    }));
                  }, 1500); // 延遲1.5秒開始運鏡動畫，讓基石動畫先開始
                }, 500); // 延遲0.5秒確保場景轉換完成
              }, 3000);
            }
          } catch (error) {
            console.error('影片播放觸發失敗:', error);
            // 降級到直接進入歡迎界面
            setCeremonyStage('welcome');
            setShowWelcomeMessage(true);
            
            setTimeout(() => {
              transitionToStage('bridge');
            }, 3000);
          }
        };
        
        // 立即開始影片播放流程
        startVideoPlayback();
      } else {
        toast.error(result.message || 'NFC 驗證失敗');
        playErrorSound();
        // 保持聚焦以便重新輸入
        if (nfcInputRef.current) {
          nfcInputRef.current.focus();
          nfcInputRef.current.select();
        }
      }
    } catch (error) {
      console.error('NFC 驗證錯誤:', error);
      toast.error('NFC 驗證失敗');
      playErrorSound();
    }
  };

  // 處理鍵盤事件
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleNfcVerification();
    } else if (event.key === 'Escape') {
      setNfcCardId('');
      if (nfcInputRef.current) {
        nfcInputRef.current.blur();
      }
    }
  };

  // 自動聚焦 NFC 輸入框
  useEffect(() => {
    if (ceremonyStage === 'oath' && nfcInputRef.current) {
      // 延遲聚焦以確保元素已渲染
      setTimeout(() => {
        nfcInputRef.current.focus();
      }, 100);
    }
  }, [ceremonyStage]);

  // 開始橋樑場景
  const startBridgeScene = () => {
    transitionToStage('bridge');
  };

  // 完成儀式
  const completeCeremony = () => {
    transitionToStage('completed');
    playSuccessSound();
    
    // 清理 Three.js 資源
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    
    setTimeout(() => {
      transitionToStage('oath');
      setNewMember(null);
      setNfcCardId('');
    }, 5000);
  };

  // 增強的階段切換函數，包含豪華過渡效果
  const transitionToStage = (newStage) => {
    // 跳過橋樑場景，直接從 welcome 到 completed
    if (newStage === 'bridge') {
      newStage = 'completed';
    }
    
    setIsTransitioning(true);
    
    // 播放場景過渡音效
    playTransitionSound();
    
    // 觸發場景過渡動畫
    triggerSceneTransition(newStage);
    
    // 如果是完成階段，播放慶祝音效
    if (newStage === 'completed') {
      setTimeout(() => {
        playCelebrationSound();
      }, 500);
    }
    
    // 使用設置中的過渡時長，增加到更流暢的時間
    const duration = ceremonySettings.transitionDuration || 1500;
    
    // 分階段過渡，創造更流暢的體驗
    setTimeout(() => {
      // 第一階段：淡出當前場景
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child.material) {
            if (child.material.opacity !== undefined) {
              child.material.transparent = true;
              child.material.opacity = 0.3;
            }
          }
        });
      }
    }, duration * 0.3);
    
    setTimeout(() => {
      // 第二階段：切換場景狀態
      setCeremonyStage(newStage);
      updateProgress(newStage);
    }, duration * 0.6);
    
    setTimeout(() => {
      // 第三階段：淡入新場景
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child.material) {
            if (child.material.opacity !== undefined) {
              child.material.transparent = true;
              child.material.opacity = 1.0;
            }
          }
        });
      }
      setIsTransitioning(false);
    }, duration);
  };

  // 場景過渡動畫觸發器
  const triggerSceneTransition = (targetStage) => {
    if (!sceneRef.current || !cameraRef.current) return;

    // 根據目標場景調整視覺效果
    const transitionEffects = {
      'oath': {
        cameraPosition: { x: 0, y: 5, z: 15 },
        lightIntensity: 0.8,
        fogDensity: 0.01
      },
      'bridge': {
        cameraPosition: { x: 0, y: 8, z: 20 },
        lightIntensity: 1.2,
        fogDensity: 0.005
      },
      'ceremony': {
        cameraPosition: { x: 0, y: 6, z: 12 },
        lightIntensity: 1.5,
        fogDensity: 0.003
      },
      'completed': {
        cameraPosition: { x: 0, y: 10, z: 25 },
        lightIntensity: 2.0,
        fogDensity: 0.001
      }
    };

    const effects = transitionEffects[targetStage];
    if (effects) {
      // 平滑過渡攝影機位置
      const startPos = cameraRef.current.position.clone();
      const targetPos = new THREE.Vector3(effects.cameraPosition.x, effects.cameraPosition.y, effects.cameraPosition.z);
      
      let progress = 0;
      const transitionAnimation = () => {
        progress += 0.02;
        if (progress <= 1) {
          cameraRef.current.position.lerpVectors(startPos, targetPos, progress);
          
          // 調整光照強度
          if (ambientLightRef.current) {
            ambientLightRef.current.intensity = THREE.MathUtils.lerp(
              ambientLightRef.current.intensity,
              effects.lightIntensity,
              progress * 0.1
            );
          }
          
          // 調整霧效果
          if (sceneRef.current.fog) {
            sceneRef.current.fog.density = THREE.MathUtils.lerp(
              sceneRef.current.fog.density,
              effects.fogDensity,
              progress * 0.1
            );
          }
          
          requestAnimationFrame(transitionAnimation);
        }
      };
      
      transitionAnimation();
    }
  };

  // 更新進度
  const updateProgress = (stage) => {
    const progressMap = {
      'loading': 0,
      'oath': 20,
      'video': 40,
      'welcome': 70,
      'ceremony': 85,
      'completed': 100
    };
    setCeremonyProgress(progressMap[stage] || 0);
   };

  // 進度指示器組件 - 奢華設計
  const ProgressIndicator = () => (
    <div className="relative">
      <div className="bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md rounded-2xl p-6 min-w-96 border border-yellow-400/30 shadow-2xl">
        {/* 頂部裝飾 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-3 h-3 bg-black rounded-full"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-semibold text-lg tracking-wide">儀式進度</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400 font-bold text-xl">{ceremonyProgress}%</span>
          </div>
        </div>
        
        {/* 進度條容器 */}
        <div className="relative mb-4">
          <div className="w-full bg-gradient-to-r from-gray-800 to-gray-700 rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden shadow-lg"
              style={{ width: `${ceremonyProgress}%` }}
            >
              {/* 閃爍效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              {/* 流動光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent transform -skew-x-12 animate-pulse"></div>
            </div>
          </div>
          
          {/* 進度條光暈 */}
          <div 
            className="absolute top-0 h-3 bg-yellow-400/20 rounded-full blur-sm transition-all duration-1000 ease-out"
            style={{ width: `${ceremonyProgress}%` }}
          ></div>
        </div>
        
        {/* 階段指示器 */}
        <div className="flex justify-between text-sm">
          {[
            { stage: 'oath', label: '誓詞', icon: '📜' },
            { stage: 'bridge', label: '橋樑', icon: '🌉' },
            { stage: 'ceremony', label: '儀式', icon: '✨' },
            { stage: 'completed', label: '完成', icon: '🎉' }
          ].map((item, index) => (
            <div 
              key={item.stage}
              className={`flex flex-col items-center space-y-1 transition-all duration-300 ${
                ceremonyStage === item.stage 
                  ? 'text-yellow-400 transform scale-110' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className={`text-lg ${ceremonyStage === item.stage ? 'animate-bounce' : ''}`}>
                {item.icon}
              </div>
              <span className="font-medium tracking-wide">{item.label}</span>
              {ceremonyStage === item.stage && (
                <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* 底部裝飾線 */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
      </div>
    </div>
  );

  // 用戶引導組件 - 奢華金色設計
  const UserGuide = () => {
    if (!showGuide) return null;

    const getGuideContent = () => {
      switch (ceremonyStage) {
        case 'oath':
          return {
            title: '步驟 1: 朗讀誓詞',
            content: '請新會員大聲朗讀 GBC 會員誓詞，然後使用 NFC 卡片進行身份驗證。',
            tips: ['確保 NFC 卡片已激活', '輸入完成後按 Enter 鍵', '按 Esc 鍵可清除輸入'],
            icon: '📜'
          };
        case 'bridge':
          return {
            title: '步驟 2: 橋樑場景',
            content: '觀看 3D 橋樑場景，新會員的基石將被添加到成功之橋上。',
            tips: ['拖動滑鼠旋轉視角', '滾輪縮放場景', '點擊橋墩查看會員資訊'],
            icon: '🌉'
          };
        case 'ceremony':
          return {
            title: '步驟 3: 歡迎儀式',
            content: '歡迎新會員正式加入 GBC 大家庭！',
            tips: ['儀式即將完成', '準備慶祝新會員的加入'],
            icon: '✨'
          };
        default:
          return null;
      }
    };

    const guide = getGuideContent();
    if (!guide) return null;

    return (
      <div className="fixed bottom-6 left-6 z-40 max-w-sm">
        <div className="relative">
          {/* 主容器 - 奢華黑金設計 */}
          <div className="bg-gradient-to-br from-black/95 via-gray-900/98 to-black/95 backdrop-blur-lg rounded-2xl p-6 border border-yellow-400/40 shadow-2xl">
            {/* 頂部裝飾和圖標 */}
            <div className="absolute -top-3 left-6">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-black">
                <span className="text-lg">{guide.icon}</span>
              </div>
            </div>
            
            {/* 標題區域 */}
            <div className="flex items-center justify-between mb-4 pt-2">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-6 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                <h4 className="text-lg font-bold text-yellow-400 tracking-wide">{guide.title}</h4>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-yellow-400 text-xl transition-colors duration-200 hover:scale-110 transform"
              >
                ×
              </button>
            </div>
            
            {/* 內容描述 */}
            <div className="mb-4 p-3 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-lg border border-yellow-400/20">
              <p className="text-gray-200 leading-relaxed">{guide.content}</p>
            </div>
            
            {/* 提示列表 */}
            <div className="space-y-2 mb-4">
              <div className="text-sm text-yellow-400 font-semibold mb-2 flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                操作提示
              </div>
              {guide.tips.map((tip, index) => (
                <div key={index} className="flex items-start text-sm text-gray-300 group hover:text-gray-100 transition-colors duration-200">
                  <div className="w-1.5 h-1.5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mr-3 mt-2 group-hover:scale-125 transition-transform duration-200"></div>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
            
            {/* 底部按鈕 */}
            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 hover:from-yellow-400/30 hover:to-orange-500/30 text-yellow-400 hover:text-yellow-300 font-medium rounded-lg border border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-200 text-sm"
            >
              我知道了，隱藏提示
            </button>
            
            {/* 底部裝飾線 */}
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
            
            {/* 側邊光效 */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-16 bg-gradient-to-b from-transparent via-yellow-400/60 to-transparent"></div>
          </div>
          
          {/* 外部光暈效果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-500/5 rounded-2xl blur-xl -z-10"></div>
        </div>
      </div>
    );
  };

  // 豪華過渡動畫組件
  const TransitionOverlay = () => {
    if (!isTransitioning) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 豪華漸變背景 */}
        <div 
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, 
                rgba(255, 215, 0, 0.1) 0%,
                rgba(184, 134, 11, 0.2) 30%,
                rgba(0, 0, 0, 0.8) 70%,
                rgba(0, 0, 0, 0.95) 100%
              )
            `
          }}
        />
        
        {/* 動態粒子背景 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-70"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* 主要內容區域 */}
        <div className="relative text-center z-10">
          {/* 豪華旋轉環 */}
          <div className="relative mb-8">
            {/* 外環 */}
            <div 
              className="w-24 h-24 border-4 border-transparent rounded-full mx-auto"
              style={{
                background: 'linear-gradient(45deg, #FFD700, #FFA500, #FFD700)',
                animation: 'spin 2s linear infinite'
              }}
            />
            {/* 內環 */}
            <div 
              className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-16 border-4 border-transparent rounded-full"
              style={{
                background: 'linear-gradient(-45deg, #FFA500, #FFD700, #FFA500)',
                animation: 'spin 1.5s linear infinite reverse'
              }}
            />
            {/* 中心光點 */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-300 rounded-full"
              style={{
                boxShadow: '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFD700',
                animation: 'pulse 1s ease-in-out infinite'
              }}
            />
          </div>

          {/* 豪華標題 */}
          <h3 
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent"
            style={{
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              animation: 'glow 2s ease-in-out infinite alternate'
            }}
          >
            場景轉換中
          </h3>

          {/* 優雅的描述文字 */}
          <p className="text-white text-lg opacity-90 mb-6">
            正在為您準備下一個精彩時刻...
          </p>

          {/* 進度條 */}
          <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              style={{
                animation: 'progress 1.5s ease-in-out infinite'
              }}
            />
          </div>
        </div>

        {/* 添加 CSS 動畫樣式 */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          
          @keyframes glow {
            0% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
            100% { text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6); }
          }
          
          @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  };

  // 渲染不同階段的內容
  const renderStageContent = () => {
    switch (ceremonyStage) {
      case 'loading':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-white">正在初始化儀式...</h2>
            </div>
          </div>
        );

      case 'oath':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-6xl font-bold text-yellow-400 mb-8">
                GBC 連結之橋儀式
              </h1>
              
              <div className="bg-black bg-opacity-50 rounded-lg p-8 mb-8">
                <h2 className="text-3xl font-bold text-white mb-6">會員誓詞</h2>
                <p className="text-xl text-gray-200 leading-relaxed whitespace-pre-line">
                  {oath}
                </p>
              </div>

              {/* NFC Gateway 控制面板 */}
              <div className="bg-black bg-opacity-50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">🏷️ NFC Gateway 狀態</h3>
                
                {gatewayStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white">Gateway 服務:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        gatewayStatus.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {gatewayStatus.success ? '運行中' : '未連接'}
                      </span>
                    </div>
                    
                    {gatewayStatus.success && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-white">NFC 讀卡機:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            gatewayStatus.readerConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {gatewayStatus.readerConnected ? '已連接' : '未連接'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-white">自動感應:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isNfcReading ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                          }`}>
                            {isNfcReading ? '已啟動' : '未啟動'}
                          </span>
                        </div>
                        
                        {gatewayStatus.readerName && (
                          <div className="text-sm text-gray-300">
                            讀卡機型號: {gatewayStatus.readerName}
                          </div>
                        )}
                        
                        {gatewayStatus.lastCardUid && (
                          <div className="bg-gray-700 rounded p-3">
                            <div className="text-sm text-gray-300">最後讀取卡片:</div>
                            <div className="font-mono text-lg text-white">{gatewayStatus.lastCardUid}</div>
                            {gatewayStatus.lastScanTime && (
                              <div className="text-sm text-gray-400">{gatewayStatus.lastScanTime}</div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex gap-3 justify-center">
                      {gatewayStatus.success && gatewayStatus.readerConnected && (
                        <>
                          {!isNfcReading ? (
                            <button
                              onClick={startNFCReading}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                            >
                              啟動自動感應
                            </button>
                          ) : (
                            <button
                              onClick={stopNFCReading}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                            >
                              停止自動感應
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={checkGatewayStatus}
                        disabled={connecting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-400 transition-colors"
                      >
                        {connecting ? '檢查中...' : '重新檢查'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-gray-400">正在檢查 NFC Gateway 狀態...</div>
                  </div>
                )}
                
                {/* 錯誤和成功訊息 */}
                {nfcError && (
                  <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">⚠️</span>
                      <span>{nfcError}</span>
                    </div>
                  </div>
                )}
                
                {nfcSuccess && (
                  <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">✅</span>
                      <span>{nfcSuccess}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-black bg-opacity-50 rounded-lg p-8 mb-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                  請新會員上前，朗讀誓詞並使用您的 GBC 電子名片進行感應
                </h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium mb-2 text-white">NFC 卡片 ID:</label>
                  <input
                    ref={nfcInputRef}
                    type="text"
                    value={nfcCardId}
                    placeholder="請以 NFC 感應卡片以繼續"
                    className="w-full max-w-md mx-auto px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center font-mono tracking-wider bg-white text-black"
                    autoComplete="off"
                    readOnly
                  />
                  {/* 手動按鈕已隱藏：請以 NFC 感應卡片以繼續 */}
                </div>
              </div>

              <button
                onClick={startBridgeScene}
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors text-xl"
              >
                開始橋樑場景
              </button>
            </div>
          </div>
        );

      case 'video':
        // 全螢幕影片播放模式
        if (isFullscreenVideo) {
          return (
            <div className="fixed inset-0 z-50 bg-black">
              {videoData && !isVideoLoading && !videoError && (
                <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  onPlay={handleVideoPlay}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={() => {
                    setVideoError('影片播放失敗');
                    console.error('影片播放錯誤');
                  }}
                  style={{ 
                    backgroundColor: '#000',
                    cursor: 'none' // 隱藏滑鼠游標
                  }}
                  controls={false} // 完全隱藏控制項
                >
                  <source src={videoBlobUrl || videoData.file_url} type="video/mp4" />
                </video>

                {prestigeOverlayVisible && (
                  <>
                    <style>{`
                      @keyframes shineMove {
                        0% { transform: translateX(-30%); }
                        50% { transform: translateX(120%); }
                        100% { transform: translateX(130%); }
                      }
                      .prestige-text {
                        position: relative;
                        color: transparent;
                        background-image: linear-gradient(135deg, #2b2b2b 0%, #3a3a3a 10%, #B58E31 25%, #E3C770 40%, #F5DFA0 55%, #C8A548 70%, #AE8A2B 85%, #2b2b2b 100%);
                        -webkit-background-clip: text;
                        background-clip: text;
                        text-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06);
                        letter-spacing: 0.1em;
                      }
                      .prestige-overlay {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        pointer-events: none;
                      }
                      .shine {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 25%;
                        height: 100%;
                        background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%);
                        filter: blur(2px);
                        mix-blend-mode: screen;
                        animation: shineMove 2.5s ease-in-out forwards;
                      }
                      .prestige-frame {
                        border: 1px solid rgba(218,165,32,0.25);
                        box-shadow: 0 0 30px rgba(218,165,32,0.25), inset 0 0 20px rgba(0,0,0,0.4);
                        background: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.0) 100%);
                      }
                    `}</style>
                    <div className="prestige-overlay">
                      <div className="relative px-10 py-6 rounded-2xl prestige-frame">
                        <h2 className="prestige-text text-center text-3xl md:text-5xl font-extrabold tracking-widest">
                          {`歡迎 ${(newMember?.industry ?? newMember?.profession ?? newMember?.company ?? '尊貴來賓')} ${(newMember?.name ?? '新會員')} 加入GBC`}
                          <span className="shine" />
                        </h2>
                      </div>
                    </div>
                  </>
                )}
                </>
              )}
            </div>
          );
        }

        // 非全螢幕模式的影片播放界面
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 relative">
            {/* 背景裝飾 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-orange-500 rounded-full animate-pulse opacity-80"></div>
              <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce opacity-70"></div>
              <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-yellow-500 rounded-full animate-ping opacity-50"></div>
            </div>
            
            <div className="max-w-6xl w-full">
              {isVideoLoading && (
                <div className="text-center mb-8">
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-8 mb-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-2">正在載入歡迎影片</h3>
                    <p className="text-gray-300">請稍候，我們正在為您準備專屬的歡迎體驗...</p>
                    {downloadProgress > 0 && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-300 mt-2">{Math.round(downloadProgress)}% 完成</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {videoError && (
                <div className="text-center mb-8">
                  <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-6 mb-4">
                    <h3 className="text-xl font-bold text-red-400 mb-2">影片載入失敗</h3>
                    <p className="text-gray-300">{videoError}</p>
                  </div>
                  <button
                    onClick={handleVideoEnded}
                    className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                  >
                    跳過影片，繼續儀式
                  </button>
                </div>
              )}
              
              {videoData && !isVideoLoading && !videoError && (
                <div className="relative">
                  {/* 影片播放器 */}
                  <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-yellow-400/30">
                    <video
                      ref={videoRef}
                      className="w-full h-auto max-h-[80vh] object-contain"
                      autoPlay
                      onPlay={handleVideoPlay}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onEnded={handleVideoEnded}
                      onError={() => {
                        setVideoError('影片播放失敗');
                        console.error('影片播放錯誤');
                      }}
                      style={{ backgroundColor: '#000' }}
                      controls={false} // 隱藏預設控制項
                    >
                      <source src={videoBlobUrl || videoData.file_url} type="video/mp4" />
                      您的瀏覽器不支援影片播放。
                    </video>

                    {prestigeOverlayVisible && (
                      <>
                        <style>{`
                          @keyframes shineMove {
                            0% { transform: translateX(-30%); }
                            50% { transform: translateX(120%); }
                            100% { transform: translateX(130%); }
                          }
                          .prestige-text {
                            position: relative;
                            color: transparent;
                            background-image: linear-gradient(135deg, #2b2b2b 0%, #3a3a3a 10%, #B58E31 25%, #E3C770 40%, #F5DFA0 55%, #C8A548 70%, #AE8A2B 85%, #2b2b2b 100%);
                            -webkit-background-clip: text;
                            background-clip: text;
                            text-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06);
                            letter-spacing: 0.1em;
                          }
                          .prestige-overlay {
                            position: absolute;
                            inset: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            pointer-events: none;
                          }
                          .shine {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 25%;
                            height: 100%;
                            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%);
                            filter: blur(2px);
                            mix-blend-mode: screen;
                            animation: shineMove 2.5s ease-in-out forwards;
                          }
                          .prestige-frame {
                            border: 1px solid rgba(218,165,32,0.25);
                            box-shadow: 0 0 30px rgba(218,165,32,0.25), inset 0 0 20px rgba(0,0,0,0.4);
                            background: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.0) 100%);
                          }
                        `}</style>
                        <div className="prestige-overlay">
                          <div className="relative px-8 py-5 rounded-2xl prestige-frame">
                            <h2 className="prestige-text text-center text-2xl md:text-4xl font-extrabold tracking-widest">
                              {`歡迎 ${(newMember?.industry ?? newMember?.profession ?? newMember?.company ?? '尊貴來賓')} ${(newMember?.name ?? '新會員')} 加入GBC`}
                              <span className="shine" />
                            </h2>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* 簡化的控制覆蓋層 */}
                    <div className="absolute bottom-4 right-4">
                      <button
                        onClick={handleVideoEnded}
                        className="px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg border border-white/30 transition-colors text-sm backdrop-blur-sm"
                      >
                        跳過
                      </button>
                    </div>
                  </div>
                  
                  {/* 底部提示 */}
                  <div className="text-center mt-6">
                    <p className="text-gray-400 text-sm">
                      影片將自動全螢幕播放，播放完成後將進入歡迎界面
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      break;
      
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 relative">
            {/* 背景裝飾 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-orange-500 rounded-full animate-pulse opacity-80"></div>
              <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce opacity-70"></div>
              <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-yellow-500 rounded-full animate-ping opacity-50"></div>
            </div>
            
            <div className="text-center relative z-10 max-w-4xl mx-auto">
              {/* 主標題 */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 blur-3xl rounded-full"></div>
                <h1 className="relative text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent mb-4 tracking-wide">
                  歡迎加入 GBC！
                </h1>
                <div className="flex justify-center items-center space-x-4 mt-4">
                  <div className="w-16 h-px bg-gradient-to-r from-transparent to-yellow-400"></div>
                  <div className="text-4xl">🎉</div>
                  <div className="w-16 h-px bg-gradient-to-l from-transparent to-yellow-400"></div>
                </div>
              </div>
              
              {/* 新會員歡迎卡片 */}
              {newMember && (
                <div className="relative mb-12">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 blur-xl rounded-3xl"></div>
                  <div className="relative bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-lg rounded-3xl p-8 border border-yellow-400/40 shadow-2xl">
                    {/* 頂部裝飾 */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-black">
                        <span className="text-black font-bold text-2xl">👋</span>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                        {newMember.name}
                      </h2>
                      
                      {/* 會員信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {newMember.profession && (
                          <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-lg p-4 border border-yellow-400/20">
                            <h3 className="text-yellow-400 font-semibold mb-2">專業領域</h3>
                            <p className="text-gray-200 text-lg">{newMember.profession}</p>
                          </div>
                        )}
                        
                        {newMember.company && (
                          <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-lg p-4 border border-yellow-400/20">
                            <h3 className="text-yellow-400 font-semibold mb-2">所屬公司</h3>
                            <p className="text-gray-200 text-lg">{newMember.company}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* 定制歡迎語 */}
                      <div className="bg-gradient-to-r from-blue-400/10 to-purple-500/10 rounded-lg p-6 border border-blue-400/20 mb-6">
                        <h3 className="text-blue-400 font-semibold mb-3 text-lg">專屬歡迎語</h3>
                        <p className="text-gray-200 text-xl leading-relaxed italic">
                          "歡迎 {newMember.name} 加入 GBC 大家庭！我們期待與您一起在{newMember.profession || '您的專業領域'}中創造更多合作機會，共同搭建通往成功的橋樑。"
                        </p>
                      </div>
                      
                      {/* 成就徽章 */}
                      <div className="flex justify-center space-x-4">
                        <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                          <span className="text-2xl">🤝</span>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                          <span className="text-2xl">🌟</span>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                          <span className="text-2xl">🎯</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 底部裝飾線 */}
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
                  </div>
                </div>
              )}
              
              {/* 自動進入提示 */}
              <div className="text-center">
                <p className="text-lg text-gray-400 mb-4">
                  即將自動進入橋樑場景...
                </p>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>
          </div>
        );
        break;

      case 'bridge':
        return (
          <div className="relative h-full">
            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* 控制面板 */}
            <div className="absolute top-8 left-8 bg-black bg-opacity-70 p-6 rounded-lg max-w-sm">
              <h3 className="text-2xl font-bold mb-4">GBC 成功之橋</h3>
              <p className="text-lg mb-2">現有會員: {bridgeData.length} 位</p>
              <p className="text-lg mb-4">等待新會員加入...</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">NFC 卡片 ID:</label>
                  <input
                    type="text"
                    value={nfcCardId}
                    onChange={(e) => setNfcCardId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-yellow-400 focus:outline-none"
                    placeholder="請輸入或感應 NFC 卡片"
                  />
                </div>
                <button
                  onClick={handleNfcVerification}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded transition-colors"
                >
                  驗證會員
                </button>
                <button
                  onClick={() => setCeremonyStage('oath')}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors"
                >
                  返回誓詞
                </button>
              </div>
            </div>

            {/* 會員詳情面板 */}
            {selectedPillar && (
              <div className="absolute top-8 right-8 bg-black bg-opacity-70 p-6 rounded-lg max-w-sm">
                <h3 className="text-xl font-bold mb-4">會員資訊</h3>
                <div className="space-y-2">
                  <p><strong>姓名:</strong> {selectedPillar.name}</p>
                  <p><strong>專業:</strong> {selectedPillar.profession || '未設定'}</p>
                  <p><strong>公司:</strong> {selectedPillar.company || '未設定'}</p>
                </div>
                <button
                  onClick={() => setSelectedPillar(null)}
                  className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                >
                  關閉
                </button>
              </div>
            )}

            {/* 操作說明 */}
            <div className="absolute bottom-8 left-8 bg-black bg-opacity-70 p-4 rounded-lg">
              <h4 className="text-lg font-bold mb-2">操作說明</h4>
              <ul className="text-sm space-y-1">
                <li>• 拖動滑鼠旋轉視角</li>
                <li>• 滾輪縮放場景</li>
                <li>• 點擊橋墩查看會員資訊</li>
              </ul>
            </div>
          </div>
        );
        break;

      case 'ceremony':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 relative">
            {/* 背景裝飾粒子 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-orange-500 rounded-full animate-pulse opacity-80"></div>
              <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce opacity-70"></div>
              <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-yellow-500 rounded-full animate-ping opacity-50"></div>
            </div>
            
            <div className="text-center relative z-10">
              {/* 主標題 - 奢華設計 */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 blur-3xl rounded-full"></div>
                <h1 className="relative text-7xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent mb-4 tracking-wide">
                  歡迎加入 GBC！
                </h1>
                <div className="flex justify-center items-center space-x-4 mt-4">
                  <div className="w-16 h-px bg-gradient-to-r from-transparent to-yellow-400"></div>
                  <div className="text-4xl">🎉</div>
                  <div className="w-16 h-px bg-gradient-to-l from-transparent to-yellow-400"></div>
                </div>
              </div>
              
              {/* 新會員信息卡片 - 奢華設計 */}
              {newMember && (
                <div className="relative mb-12 max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 blur-xl rounded-2xl"></div>
                  <div className="relative bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-lg rounded-2xl p-8 border border-yellow-400/40 shadow-2xl">
                    {/* 頂部裝飾 */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-black">
                        <span className="text-black font-bold text-xl">★</span>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h2 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6 tracking-wide">
                        {newMember.name}
                      </h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <p className="text-2xl text-gray-200 font-medium">
                            專業：<span className="text-yellow-400">{newMember.profession}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-center space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <p className="text-xl text-gray-300 font-medium">
                            公司：<span className="text-orange-400">{newMember.company}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 底部裝飾線 */}
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
                  </div>
                </div>
              )}

              {/* 標語卡片 - 奢華設計 */}
              <div className="relative mb-12 max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 blur-2xl rounded-2xl"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl p-8 shadow-2xl">
                  <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-4xl font-bold text-black tracking-wide leading-relaxed">
                      共同搭建我們的未來！
                    </h3>
                    <div className="flex justify-center mt-4 space-x-2">
                      <div className="w-3 h-3 bg-black/30 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-black/30 rounded-full animate-bounce delay-100"></div>
                      <div className="w-3 h-3 bg-black/30 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 完成按鈕 - 奢華設計 */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-500/20 blur-xl rounded-2xl"></div>
                <button
                  onClick={completeCeremony}
                  className="relative px-12 py-6 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-500 hover:via-emerald-500 hover:to-green-500 text-white font-bold rounded-2xl transition-all duration-300 text-2xl shadow-2xl border border-green-400/30 hover:border-green-400/50 transform hover:scale-105 hover:shadow-green-500/25"
                >
                  <span className="flex items-center space-x-3">
                    <span>完成儀式</span>
                    <span className="text-3xl">🎊</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
        break;

      case 'completed':
        return (
          <div className="flex items-center justify-center h-full relative overflow-hidden">
            {/* 慶祝背景動畫 */}
            <div className="absolute inset-0 pointer-events-none">
              {/* 飄落的金色粒子 */}
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce opacity-80" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce opacity-70" style={{animationDelay: '0.5s', animationDuration: '2.5s'}}></div>
              <div className="absolute top-0 right-1/4 w-2.5 h-2.5 bg-yellow-300 rounded-full animate-bounce opacity-90" style={{animationDelay: '1s', animationDuration: '2s'}}></div>
              <div className="absolute top-0 left-3/4 w-1 h-1 bg-orange-400 rounded-full animate-bounce opacity-60" style={{animationDelay: '1.5s', animationDuration: '3.5s'}}></div>
              
              {/* 光環效果 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-orange-500/15 to-yellow-400/15 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            <div className="text-center relative z-10 max-w-4xl mx-auto px-8">
              {/* 主慶祝區域 */}
              <div className="relative mb-12">
                {/* 頂部慶祝圖標 */}
                <div className="flex justify-center items-center space-x-6 mb-8">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <div className="text-7xl animate-pulse">✨</div>
                  <div className="text-6xl animate-bounce" style={{animationDelay: '0.5s'}}>🎊</div>
                </div>
                
                {/* 主標題 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-orange-500/30 blur-3xl rounded-full"></div>
                  <h2 className="relative text-7xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent mb-6 tracking-wide">
                    儀式完成！
                  </h2>
                </div>
                
                {/* 裝飾線 */}
                <div className="flex justify-center items-center space-x-4 mb-8">
                  <div className="w-24 h-px bg-gradient-to-r from-transparent to-yellow-400"></div>
                  <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full"></div>
                  <div className="w-24 h-px bg-gradient-to-l from-transparent to-yellow-400"></div>
                </div>
              </div>
              
              {/* 成功信息卡片 */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 blur-xl rounded-3xl"></div>
                <div className="relative bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-lg rounded-3xl p-8 border border-yellow-400/40 shadow-2xl">
                  {/* 頂部裝飾 */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-black">
                      <span className="text-black font-bold text-2xl">🏆</span>
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    <p className="text-3xl text-gray-200 font-medium leading-relaxed">
                      新會員已成功加入
                    </p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mt-2">
                      GBC 大家庭
                    </p>
                    
                    {/* 成就徽章 */}
                    <div className="flex justify-center mt-6 space-x-4">
                      <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                        <span className="text-2xl">🤝</span>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                        <span className="text-2xl">🌟</span>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full p-3 border border-yellow-400/30">
                        <span className="text-2xl">🎯</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 底部裝飾線 */}
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
                </div>
              </div>
              
              {/* 操作按鈕區域 */}
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* 重新開始按鈕 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 blur-xl rounded-2xl"></div>
                  <button
                    onClick={() => {
                      setCeremonyStage('oath');
                      setNewMember(null);
                      setNfcCardId('');
                    }}
                    className="relative px-10 py-5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all duration-300 text-xl shadow-2xl border border-blue-400/30 hover:border-blue-400/50 transform hover:scale-105"
                  >
                    <span className="flex items-center space-x-3">
                      <span>🔄</span>
                      <span>重新開始儀式</span>
                    </span>
                  </button>
                </div>
                
                {/* 返回管理面板按鈕 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-slate-500/20 blur-xl rounded-2xl"></div>
                  <button
                    onClick={() => window.location.href = '/admin'}
                    className="relative px-10 py-5 bg-gradient-to-r from-gray-700 via-slate-700 to-gray-700 hover:from-gray-600 hover:via-slate-600 hover:to-gray-600 text-white font-bold rounded-2xl transition-all duration-300 text-xl shadow-2xl border border-gray-400/30 hover:border-gray-400/50 transform hover:scale-105"
                  >
                    <span className="flex items-center space-x-3">
                      <span>🏠</span>
                      <span>返回管理面板</span>
                    </span>
                  </button>
                </div>
              </div>
              
              {/* 底部祝福語 */}
              <div className="mt-12 text-center">
                <p className="text-lg text-gray-400 italic">
                  "連結成就未來，合作創造奇蹟"
                </p>
                <div className="flex justify-center mt-4 space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>
          </div>
        );
        break;

      default:
        return null;
    }
  };

  // 最終權限檢查
  const isCore = Number(user?.membershipLevel) === 1;
  const isAdmin = user?.email?.includes('admin') && Number(user?.membershipLevel) === 1;
  
  if (!user || (!isCore && !isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">權限不足</h1>
          <p className="text-gray-300">您沒有權限訪問此頁面</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ceremonyRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} relative overflow-hidden`}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 30%, #0f0f23 70%, #000000 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 奢華背景裝飾 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-500/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* 金色邊框裝飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60"></div>
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-60"></div>
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-60"></div>
      </div>

      {/* 控制面板 - 奢華設計 */}
      {!isFullscreen && (
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={enterFullscreen}
            className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50"
          >
            <span className="relative z-10">進入全螢幕</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={exitFullscreen}
            className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:from-red-400 hover:to-red-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
          >
            <span className="relative z-10">退出全螢幕</span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </div>
      )}

      {/* GBC Logo 水印 */}
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-black font-bold text-lg">G</span>
          </div>
          <div className="text-yellow-400 font-bold text-xl tracking-wider">
            GBC
          </div>
        </div>
      </div>

      {/* 進度指示器 - 奢華設計 */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <ProgressIndicator />
      </div>
      
      {/* 用戶引導 - 優化位置 */}
      <div className="absolute bottom-6 left-6 z-10">
        <UserGuide />
      </div>
      
      {/* 過渡動畫 */}
      <TransitionOverlay />

      {/* 主要內容 */}
      <div className="w-full h-full relative z-5">
        {renderStageContent()}
      </div>

      {/* 底部裝飾線 */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
    </div>
  );
};

export default ConnectionCeremony;