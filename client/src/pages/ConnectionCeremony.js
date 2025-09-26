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
    if (!user || !['core', 'admin'].includes(user.membership_level)) {
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

  // 創建星空背景
  const createStarField = (scene) => {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 200 + 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

      // 星星顏色變化
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  };

  // 設置高級光照系統
  const setupAdvancedLighting = (scene) => {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 主要方向光（月光效果）
    const moonLight = new THREE.DirectionalLight(0xffffff, 0.8);
    moonLight.position.set(10, 20, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 50;
    moonLight.shadow.camera.left = -30;
    moonLight.shadow.camera.right = 30;
    moonLight.shadow.camera.top = 30;
    moonLight.shadow.camera.bottom = -30;
    scene.add(moonLight);

    // 橋樑聚光燈
    const bridgeSpotlight = new THREE.SpotLight(0xffd700, 1, 50, Math.PI / 6, 0.5);
    bridgeSpotlight.position.set(0, 25, 0);
    bridgeSpotlight.target.position.set(0, 0, 0);
    bridgeSpotlight.castShadow = true;
    scene.add(bridgeSpotlight);
    scene.add(bridgeSpotlight.target);

    // 動態彩色光束
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57];
    colors.forEach((color, index) => {
      const light = new THREE.PointLight(color, 0.5, 20);
      light.position.set(
        (index - 2) * 10,
        15,
        Math.sin(index) * 5
      );
      scene.add(light);
    });
  };

  // 創建粒子系統
  const createParticleSystem = (scene) => {
    const particleCount = 500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // 初始位置
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      // 速度
      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = Math.random() * 0.05 + 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      // 顏色
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData = { velocities };
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;
  };

  const createBridgeBase = (scene) => {
    // 橋面
    const bridgeGeometry = new THREE.BoxGeometry(bridgeData.length * 8 + 20, 2, 10);
    const bridgeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    bridge.position.y = 5;
    bridge.receiveShadow = true;
    scene.add(bridge);

    // 橋樑支撐結構
    for (let i = 0; i < bridgeData.length + 1; i++) {
      const supportGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10);
      const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const support = new THREE.Mesh(supportGeometry, supportMaterial);
      support.position.set((i - bridgeData.length / 2) * 8, 0, 0);
      support.castShadow = true;
      scene.add(support);
    }

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    scene.add(ground);
  };

  const createMemberPillars = (scene) => {
    const pillars = [];
    
    bridgeData.forEach((member, index) => {
      // 橋墩主體
      const pillarGeometry = new THREE.BoxGeometry(4, 8, 4);
      const pillarMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(index / bridgeData.length, 0.7, 0.6) 
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set((index - bridgeData.length / 2) * 8, 9, 0);
      pillar.castShadow = true;
      pillar.userData = { member, index };
      scene.add(pillar);

      // 會員名稱標籤
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 128;
      context.fillStyle = 'white';
      context.fillRect(0, 0, 256, 128);
      context.fillStyle = 'black';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText(member.name, 128, 50);
      context.fillText(member.profession || '專業別', 128, 80);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const labelGeometry = new THREE.PlaneGeometry(6, 3);
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set((index - bridgeData.length / 2) * 8, 15, 0);
      scene.add(label);

      pillars.push({ pillar, label, member });
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
    
    // 更新粒子系統
    if (particleSystemRef.current) {
      const positions = particleSystemRef.current.geometry.attributes.position.array;
      const velocities = particleSystemRef.current.userData.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // 重置超出邊界的粒子
        if (positions[i + 1] > 50) {
          positions[i] = (Math.random() - 0.5) * 100;
          positions[i + 1] = 0;
          positions[i + 2] = (Math.random() - 0.5) * 100;
        }
      }
      
      particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // 動態光照效果
    if (ambientLightRef.current) {
      const time = Date.now() * 0.001;
      ambientLightRef.current.intensity = 0.3 + Math.sin(time * 0.5) * 0.1;
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

  // 進度指示器組件
  const ProgressIndicator = () => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black bg-opacity-80 rounded-lg p-4 min-w-96">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium">儀式進度</span>
          <span className="text-yellow-400 font-bold">{ceremonyProgress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${ceremonyProgress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span className={ceremonyStage === 'oath' ? 'text-yellow-400' : ''}>誓詞</span>
          <span className={ceremonyStage === 'bridge' ? 'text-yellow-400' : ''}>橋樑</span>
          <span className={ceremonyStage === 'ceremony' ? 'text-yellow-400' : ''}>儀式</span>
          <span className={ceremonyStage === 'completed' ? 'text-yellow-400' : ''}>完成</span>
        </div>
      </div>
    </div>
  );

  // 用戶引導組件
  const UserGuide = () => {
    if (!showGuide) return null;

    const getGuideContent = () => {
      switch (ceremonyStage) {
        case 'oath':
          return {
            title: '步驟 1: 朗讀誓詞',
            content: '請新會員大聲朗讀 GBC 會員誓詞，然後使用 NFC 卡片進行身份驗證。',
            tips: ['確保 NFC 卡片已激活', '輸入完成後按 Enter 鍵', '按 Esc 鍵可清除輸入']
          };
        case 'bridge':
          return {
            title: '步驟 2: 橋樑場景',
            content: '觀看 3D 橋樑場景，新會員的基石將被添加到成功之橋上。',
            tips: ['拖動滑鼠旋轉視角', '滾輪縮放場景', '點擊橋墩查看會員資訊']
          };
        case 'ceremony':
          return {
            title: '步驟 3: 歡迎儀式',
            content: '歡迎新會員正式加入 GBC 大家庭！',
            tips: ['儀式即將完成', '準備慶祝新會員的加入']
          };
        default:
          return null;
      }
    };

    const guide = getGuideContent();
    if (!guide) return null;

    return (
      <div className="fixed top-20 right-4 z-40 max-w-sm">
        <div className="bg-blue-900 bg-opacity-95 rounded-lg p-4 border border-blue-400">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-bold text-white">{guide.title}</h4>
            <button
              onClick={() => setShowGuide(false)}
              className="text-gray-300 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-blue-100 mb-3">{guide.content}</p>
          <div className="space-y-1">
            {guide.tips.map((tip, index) => (
              <div key={index} className="flex items-center text-sm text-blue-200">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                {tip}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="mt-3 text-sm text-blue-300 hover:text-blue-100 underline"
          >
            我知道了，隱藏提示
          </button>
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
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-yellow-400 mb-8">
                歡迎加入 GBC！
              </h1>
              
              {newMember && (
                <div className="bg-black bg-opacity-50 rounded-lg p-8 mb-8">
                  <h2 className="text-4xl font-bold text-white mb-6">
                    {newMember.name}
                  </h2>
                  <p className="text-2xl text-gray-200 mb-4">
                    專業：{newMember.profession}
                  </p>
                  <p className="text-xl text-gray-300">
                    公司：{newMember.company}
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 mb-8">
                <h3 className="text-3xl font-bold text-black">
                  共同搭建我們的未來！
                </h3>
              </div>

              <button
                onClick={completeCeremony}
                className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors text-xl"
              >
                完成儀式
              </button>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-8xl mb-8">🎉</div>
              <h2 className="text-4xl font-bold text-yellow-400 mb-4">
                儀式完成！
              </h2>
              <p className="text-xl text-white mb-8">
                新會員已成功加入 GBC 大家庭
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => {
                    setCeremonyStage('oath');
                    setNewMember(null);
                    setNfcCardId('');
                  }}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  重新開始儀式
                </button>
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="px-8 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  返回管理面板
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user || !['core', 'admin'].includes(user.membership_level)) {
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
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900`}
    >
      {/* 控制面板 */}
      {!isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={enterFullscreen}
            className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            進入全螢幕
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={exitFullscreen}
            className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 transition-colors"
          >
            退出全螢幕
          </button>
        </div>
      )}

      {/* 進度指示器 */}
      <ProgressIndicator />
      
      {/* 用戶引導 */}
      <UserGuide />
      
      {/* 過渡動畫 */}
      <TransitionOverlay />

      {/* 主要內容 */}
      <div className="w-full h-full">
        {renderStageContent()}
      </div>
    </div>
  );
};

export default ConnectionCeremony;