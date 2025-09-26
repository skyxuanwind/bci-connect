import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import * as THREE from 'three';

const ConnectionCeremony = () => {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ceremonyStage, setCeremonyStage] = useState('loading'); // loading, oath, bridge, ceremony, completed
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
  
  const ceremonyRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneObjectRef = useRef();
  const pillarsRef = useRef([]);
  const animationIdRef = useRef();
  const nfcInputRef = useRef(null);
  
  // 添加粒子系統和光影效果的引用
  const particleSystemRef = useRef(null);
  const lightBeamRef = useRef(null);
  const ambientLightRef = useRef(null);

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

  // 監聽儀式階段變化，更新進度
  useEffect(() => {
    updateProgress(ceremonyStage);
  }, [ceremonyStage]);

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

  // 改善的 NFC 驗證處理
  const handleNfcVerification = async () => {
    if (!nfcCardId.trim()) {
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
        body: JSON.stringify({ nfc_card_id: nfcCardId })
      });

      const result = await response.json();

      if (result.success) {
        setNewMember(result.member);
        transitionToStage('ceremony');
        toast.success(`歡迎 ${result.member.name} 加入連結之橋！`);
        playSuccessSound();
        // 觸發新基石奠定動畫
        triggerNewPillarAnimation(result.member);
        // 清空輸入框
        setNfcCardId('');
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

  // 改善的階段切換函數
  const transitionToStage = (newStage) => {
    setIsTransitioning(true);
    
    // 使用設置中的過渡時長
    const duration = ceremonySettings.transitionDuration || 500;
    
    setTimeout(() => {
      setCeremonyStage(newStage);
      updateProgress(newStage);
      setIsTransitioning(false);
    }, duration);
  };

  // 更新進度
  const updateProgress = (stage) => {
    const progressMap = {
      'loading': 0,
      'oath': 25,
      'bridge': 50,
      'ceremony': 75,
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

  // 過渡動畫組件
  const TransitionOverlay = () => {
    if (!isTransitioning) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">正在切換階段...</p>
        </div>
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
                    onChange={(e) => setNfcCardId(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="請輸入或感應 NFC 卡片"
                    className="w-full max-w-md mx-auto px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center font-mono tracking-wider bg-white text-black"
                    autoComplete="off"
                    autoFocus
                  />
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleNfcVerification}
                      disabled={!nfcCardId.trim()}
                      className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      驗證並加入橋樑
                    </button>
                    <button
                      onClick={() => setNfcCardId('')}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      清除
                    </button>
                  </div>
                  <p className="text-sm text-white/80 mt-4">
                    提示：輸入完成後按 Enter 鍵驗證，按 Esc 鍵清除
                  </p>
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