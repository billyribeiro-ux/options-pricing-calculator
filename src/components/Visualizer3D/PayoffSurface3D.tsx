import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { IronCondorEvaluation, UnderlyingParams } from '../../quant/types';
import { blackScholes, getStrikeIV } from '../../quant/blackScholes';
import { formatCurrency } from '../../utils/formatters';
import { CameraPreset } from './SceneContainer';

interface PayoffSurface3DProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
  wireframe: boolean;
  autoRotate: boolean;
  cameraPreset?: CameraPreset;
}

export const PayoffSurface3D: React.FC<PayoffSurface3DProps> = ({
  condorEval,
  params,
  wireframe,
  autoRotate,
  cameraPreset = 'iso'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    price: number;
    dteRemaining: number;
    pnl: number;
    cursorX: number;
    cursorY: number;
    containerWidth: number;
  } | null>(null);

  const S0 = params.spotPrice;
  const maxDte = Math.max(1, params.dte);
  const sigma = params.atmIV;
  const skewSlope = params.skewSlope || 0;
  const contracts = params.contracts;
  const multiplier = contracts * 100;
  const totalCredit = condorEval.totalCreditDollars;

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  const includeCall = condorEval.mode !== 'put-spread';
  const includePut = condorEval.mode !== 'call-spread';
  const hasLongWings = condorEval.mode !== 'short-strangle';

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

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
    const xSegments = 48; // Price steps
    const ySegments = 30; // Time steps

    const range = S0 * sigma * Math.sqrt(maxDte / 365) * 3.0;
    const minPrice = S0 - range;
    const maxPrice = S0 + range;

    const geometry = new THREE.PlaneGeometry(50, 40, xSegments, ySegments);
    geometry.rotateX(-Math.PI / 2); // Lay horizontal

    // Calculate Y (height = PnL) and vertex colors
    const posAttr = geometry.attributes.position;
    const colors: number[] = [];

    const maxAbsPnL = Math.max(condorEval.maxGain, condorEval.maxLoss, 1);
    const heightScale = 12 / maxAbsPnL;

    const computePnL = (price: number, dteRem: number): number => {
      const T = Math.max(0.0005, dteRem / 365);
      const sc = includeCall
        ? blackScholes('call', price, cs, T, getStrikeIV(price, cs, sigma, skewSlope), params.riskFreeRate, params.dividendYield).price
        : 0;
      const lc = includeCall && hasLongWings
        ? blackScholes('call', price, cl, T, getStrikeIV(price, cl, sigma, skewSlope), params.riskFreeRate, params.dividendYield).price
        : 0;
      const sp = includePut
        ? blackScholes('put', price, ps, T, getStrikeIV(price, ps, sigma, skewSlope), params.riskFreeRate, params.dividendYield).price
        : 0;
      const lp = includePut && hasLongWings
        ? blackScholes('put', price, pl, T, getStrikeIV(price, pl, sigma, skewSlope), params.riskFreeRate, params.dividendYield).price
        : 0;
      const currentCost = (-sc + lc - sp + lp) * multiplier;
      return totalCredit + currentCost;
    };

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Map plane X [-25, 25] to Price [minPrice, maxPrice]
      const price = minPrice + ((vx + 25) / 50) * (maxPrice - minPrice);
      // Map plane Z [-20, 20] to Days to Expiry [0, maxDte]
      const dteRemaining = Math.max(0.001, ((vz + 20) / 40) * maxDte);

      const pnl = computePnL(price, dteRemaining);

      // Set height
      posAttr.setY(i, pnl * heightScale);

      // Color mapping: Green for profit, Red for loss
      if (pnl >= 0) {
        const t = Math.min(1, pnl / Math.max(1, condorEval.maxGain));
        colors.push(0.0, 0.53 + 0.3 * t, 0.35 + 0.2 * t);
      } else {
        const t = Math.min(1, -pnl / Math.max(1, condorEval.maxLoss));
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

    // Hover probe sphere
    const probeGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    probeMesh.visible = false;
    scene.add(probeMesh);

    // Grid Floor (Zero P&L reference plane)
    const gridHelper = new THREE.GridHelper(50, 20, 0x00629e, 0x333a42);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Interactive Orbit simulation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = cameraPreset === 'top' ? 0 : cameraPreset === 'front' ? 0 : Math.PI / 4;
    let phi = cameraPreset === 'top' ? Math.PI / 2.05 : cameraPreset === 'front' ? 0.15 : Math.PI / 6;
    let radius = 60;

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(mesh);
        if (hits.length > 0) {
          const pt = hits[0].point;
          probeMesh.position.copy(pt);
          probeMesh.visible = true;
          const hoveredPrice = minPrice + ((pt.x + 25) / 50) * (maxPrice - minPrice);
          const hoveredDte = Math.max(0, ((pt.z + 20) / 40) * maxDte);
          const hoveredPnL = computePnL(hoveredPrice, hoveredDte);
          setHoverInfo({
            price: hoveredPrice,
            dteRemaining: hoveredDte,
            pnl: hoveredPnL,
            cursorX: e.clientX - rect.left,
            cursorY: e.clientY - rect.top,
            containerWidth: rect.width
          });
        } else {
          probeMesh.visible = false;
          setHoverInfo(null);
        }
      } else {
        probeMesh.visible = false;
        setHoverInfo(null);
      }

      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      theta -= dx * 0.008;
      phi = Math.max(0.1, Math.min(Math.PI / 2.05, phi + dy * 0.008));
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
      probeGeo.dispose();
      probeMat.dispose();
      renderer.dispose();
    };
  }, [condorEval, params, wireframe, autoRotate, cameraPreset, cs, cl, ps, pl, S0, maxDte, sigma, skewSlope, totalCredit, multiplier, includeCall, includePut, hasLongWings]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 460 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />

      {hoverInfo && (() => {
        const flipLeft = hoverInfo.cursorX > hoverInfo.containerWidth - 220;
        const leftPos = flipLeft ? Math.max(8, hoverInfo.cursorX - 205) : hoverInfo.cursorX + 16;
        const topPos = Math.max(8, Math.min(350, hoverInfo.cursorY - 36));
        return (
          <div
            className="md-card md-card--tonal"
            style={{
              position: 'absolute',
              top: topPos,
              left: leftPos,
              width: 195,
              padding: '10px 14px',
              fontSize: 12,
              pointerEvents: 'none',
              boxShadow: 'var(--md-sys-elevation-level2)',
              background: 'rgba(17, 19, 24, 0.92)',
              backdropFilter: 'blur(8px)',
              color: '#e2e2e8',
              border: '1px solid rgba(255,255,255,0.14)',
              zIndex: 10
            }}
          >
            <div className="label-small" style={{ color: '#94ccff', marginBottom: 4 }}>3D SURFACE PROBE</div>
            <div>Underlying Price: <span className="mono-small">${hoverInfo.price.toFixed(2)}</span></div>
            <div>Time Remaining: <span className="mono-small">{hoverInfo.dteRemaining.toFixed(1)} DTE</span></div>
            <div>
              Theoretical P&L:{' '}
              <span
                className="mono-small"
                style={{
                  fontWeight: 700,
                  color: hoverInfo.pnl >= 0 ? '#57d9a3' : '#ff8f73'
                }}
              >
                {hoverInfo.pnl >= 0 ? '+' : ''}{formatCurrency(hoverInfo.pnl)}
              </span>
            </div>
          </div>
        );
      })()}

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.68)',
          borderRadius: 8,
          fontSize: 11,
          color: '#e2e2e8',
          pointerEvents: 'none'
        }}
      >
        Hover to Probe Surface | Drag to Orbit | Scroll to Zoom | X: Underlying Price ($), Z: DTE, Y: P&L ($)
      </div>
    </div>
  );
};
