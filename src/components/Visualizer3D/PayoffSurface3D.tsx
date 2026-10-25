import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { IronCondorEvaluation, UnderlyingParams } from '../../quant/types';
import { blackScholes } from '../../quant/blackScholes';

interface PayoffSurface3DProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
  wireframe: boolean;
  autoRotate: boolean;
}

export const PayoffSurface3D: React.FC<PayoffSurface3DProps> = ({
  condorEval,
  params,
  wireframe,
  autoRotate
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const S0 = params.spotPrice;
  const maxDte = Math.max(1, params.dte);
  const sigma = params.atmIV;
  const contracts = params.contracts;
  const multiplier = contracts * 100;
  const totalCredit = condorEval.totalCreditDollars;

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(35, 25, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // 3. Grid bounds
    const xSegments = 40; // Price steps
    const ySegments = 25; // Time steps

    const range = S0 * sigma * Math.sqrt(maxDte / 365) * 3.0;
    const minPrice = S0 - range;
    const maxPrice = S0 + range;

    const geometry = new THREE.PlaneGeometry(50, 40, xSegments, ySegments);
    geometry.rotateX(-Math.PI / 2); // Lay horizontal

    // Calculate Z (height = PnL) and vertex colors
    const posAttr = geometry.attributes.position;
    const colors: number[] = [];

    const maxAbsPnL = Math.max(condorEval.maxGain, condorEval.maxLoss, 1);
    const heightScale = 12 / maxAbsPnL;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Map plane X [-25, 25] to Price [minPrice, maxPrice]
      const price = minPrice + ((vx + 25) / 50) * (maxPrice - minPrice);
      // Map plane Z [-20, 20] to Days to Expiry [0, maxDte]
      const dteRemaining = Math.max(0.001, ((vz + 20) / 40) * maxDte);
      const T = dteRemaining / 365;

      // Calculate Black-Scholes PnL at this price and time
      const sc = blackScholes('call', price, cs, T, sigma, params.riskFreeRate, params.dividendYield).price;
      const lc = blackScholes('call', price, cl, T, sigma, params.riskFreeRate, params.dividendYield).price;
      const sp = blackScholes('put', price, ps, T, sigma, params.riskFreeRate, params.dividendYield).price;
      const lp = blackScholes('put', price, pl, T, sigma, params.riskFreeRate, params.dividendYield).price;

      const currentCost = (-sc + lc - sp + lp) * multiplier;
      const pnl = totalCredit + currentCost;

      // Set height
      posAttr.setY(i, pnl * heightScale);

      // Color mapping: Green for profit, Red for loss
      if (pnl >= 0) {
        const t = Math.min(1, pnl / condorEval.maxGain);
        colors.push(0.0, 0.53 + 0.3 * t, 0.35 + 0.2 * t);
      } else {
        const t = Math.min(1, -pnl / condorEval.maxLoss);
        colors.push(0.87 + 0.1 * t, 0.21 * (1 - t), 0.05);
      }
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(50, 20, 0x00629e, 0x333a42);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Interactive Orbit simulation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 6;
    let radius = 60;

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 2, 0);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      theta -= dx * 0.008;
      phi = Math.max(0.1, Math.min(Math.PI / 2.2, phi + dy * 0.008));
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      radius = Math.max(25, Math.min(120, radius + e.deltaY * 0.05));
      updateCamera();
      e.preventDefault();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        theta += 0.003;
        updateCamera();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const newW = mount.clientWidth;
      const newH = mount.clientHeight || 480;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [condorEval, params, wireframe, autoRotate, cs, cl, ps, pl, S0, maxDte, sigma, totalCredit, multiplier]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 460 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          fontSize: 11,
          color: '#e2e2e8',
          pointerEvents: 'none'
        }}
      >
        Left Click + Drag to Orbit | Scroll to Zoom | Green: Profit territory, Red: Loss territory
      </div>
    </div>
  );
};
