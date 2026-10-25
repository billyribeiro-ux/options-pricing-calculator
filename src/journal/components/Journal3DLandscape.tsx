import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { JournalEntry } from '../types';
import { Mountain, Layers, Play, Pause } from 'lucide-react';

interface Journal3DLandscapeProps {
  entries: JournalEntry[];
  onSelectTrade: (trade: JournalEntry) => void;
}

export const Journal3DLandscape: React.FC<Journal3DLandscapeProps> = ({ entries, onSelectTrade: _onSelectTrade }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'mountain' | 'clustering'>('mountain');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(35, 25, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const cleanupObjects: THREE.Object3D[] = [];

    // Chronological trade list
    const closedTrades = entries
      .filter((e) => e.status === 'closed' && e.realizedPnL !== undefined)
      .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

    if (mode === 'mountain') {
      // 1. 3D EQUITY & DRAWDOWN MOUNTAIN LANDSCAPE
      const xSegments = Math.max(10, closedTrades.length);
      const zSegments = 16;
      const geometry = new THREE.PlaneGeometry(50, 30, xSegments, zSegments);
      geometry.rotateX(-Math.PI / 2);

      const posAttr = geometry.attributes.position;
      const colors: number[] = [];

      // Calculate cumulative equity and drawdowns
      let cumEquity = 0;
      let peak = 0;
      const equityHistory: { equity: number; drawdown: number }[] = [];

      closedTrades.forEach((t) => {
        cumEquity += t.realizedPnL || 0;
        if (cumEquity > peak) peak = cumEquity;
        const dd = peak - cumEquity;
        equityHistory.push({ equity: cumEquity, drawdown: dd });
      });

      const maxEq = Math.max(...equityHistory.map((h) => h.equity), 1000);

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);

        // Map X [-25, 25] to trade sequence
        const tradeIdx = Math.min(
          equityHistory.length - 1,
          Math.max(0, Math.floor(((vx + 25) / 50) * (equityHistory.length - 1)))
        );

        const data = equityHistory[tradeIdx] || { equity: 0, drawdown: 0 };
        // Map Z depth [-15, 15] to drawdown taper
        const zTaper = 1.0 - Math.abs(vz) / 15;

        // Height = cumulative equity scaled with drawdown ravine
        const heightVal = ((data.equity - data.drawdown * 0.8) / maxEq) * 16 * zTaper;
        posAttr.setY(i, heightVal);

        // Green for high equity peaks, red for deep drawdowns
        if (data.drawdown > 500) {
          colors.push(0.85, 0.2, 0.1);
        } else if (data.equity > 0) {
          const t = Math.min(1, data.equity / maxEq);
          colors.push(0.0, 0.5 + 0.4 * t, 0.3 + 0.2 * t);
        } else {
          colors.push(0.5, 0.5, 0.5);
        }
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        wireframe,
        roughness: 0.3,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, mat);
      scene.add(mesh);
      cleanupObjects.push(mesh);
    } else {
      // 2. 3D TRADE CLUSTERING TOPOLOGY
      const nodeGroup = new THREE.Group();

      entries.forEach((trade) => {
        const dte = trade.snapshotAtEntry?.dte || 10;
        const iv = trade.snapshotAtEntry?.atmIV || 0.2;
        const ror = trade.returnOnRisk || 0;
        const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;

        // Map DTE to X [-20, 20]
        const x = ((dte - 5) / 45) * 40 - 20;
        // Map RoR to Y [-10, 15]
        const y = Math.max(-12, Math.min(16, ror * 40));
        // Map IV to Z [-15, 15]
        const z = ((iv - 0.1) / 0.4) * 30 - 15;

        const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const isWin = pnl > 0;
        const isOpen = trade.status === 'open';

        const color = isOpen ? 0x4c9aff : isWin ? 0x00875a : 0xde350b;
        const sphereMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.2,
          metalness: 0.1,
          wireframe
        });

        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(x, y, z);
        sphere.userData = { trade };
        nodeGroup.add(sphere);
      });

      scene.add(nodeGroup);
      cleanupObjects.push(nodeGroup);
    }

    // Grid Floor
    const grid = new THREE.GridHelper(50, 20, 0x00629e, 0x272a2f);
    grid.position.y = -0.1;
    scene.add(grid);
    cleanupObjects.push(grid);

    // Orbit controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 5;
    let radius = 60;

    const updateCamera = () => {
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 3, 0);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        theta -= dx * 0.008;
        phi = Math.max(0.1, Math.min(Math.PI / 2.2, phi + dy * 0.008));
        updateCamera();
      }
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      radius = Math.max(20, Math.min(120, radius + e.deltaY * 0.05));
      updateCamera();
      e.preventDefault();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        theta += 0.002;
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
      cleanupObjects.forEach((obj) => scene.remove(obj));
      renderer.dispose();
    };
  }, [entries, mode, wireframe, autoRotate]);

  return (
    <div className="md-card md-card--elevated" style={{ height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
      <div className="md-card__header" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mountain size={18} color="var(--md-sys-color-primary)" />
          <h3 className="md-card__title">3D Portfolio Topology & Performance Space</h3>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${mode === 'mountain' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setMode('mountain')}
            >
              Equity Mountain
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'clustering' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setMode('clustering')}
            >
              Trade Clusters (DTE vs RoR vs IV)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`md-button ${wireframe ? 'md-button--tonal' : 'md-button--outlined'}`}
            style={{ height: 32, padding: '0 10px', fontSize: 11 }}
            onClick={() => setWireframe(!wireframe)}
          >
            <Layers size={14} />
            <span>Wireframe</span>
          </button>
          <button
            className={`md-button ${autoRotate ? 'md-button--tonal' : 'md-button--outlined'}`}
            style={{ height: 32, padding: '0 10px', fontSize: 11 }}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? <Pause size={14} /> : <Play size={14} />}
            <span>Rotate</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.65)',
            borderRadius: 8,
            fontSize: 11,
            color: '#e2e2e8',
            pointerEvents: 'none'
          }}
        >
          {mode === 'mountain'
            ? 'X: Trade Timeline | Y: Cumulative Equity | Z: Drawdown Depth (Ravines)'
            : 'X: Days to Expiry (DTE) | Y: Return on Risk (RoR) | Z: Implied Volatility (IV)'}
        </div>
      </div>
    </div>
  );
};
