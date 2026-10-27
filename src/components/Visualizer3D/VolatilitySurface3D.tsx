import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { UnderlyingParams } from '../../quant/types';
import { CameraPreset } from './SceneContainer';

interface VolatilitySurface3DProps {
  params: UnderlyingParams;
  wireframe: boolean;
  autoRotate: boolean;
  cameraPreset?: CameraPreset;
}

export const VolatilitySurface3D: React.FC<VolatilitySurface3DProps> = ({
  params,
  wireframe,
  autoRotate,
  cameraPreset = 'iso'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    strike: number;
    moneynessPct: number;
    days: number;
    iv: number;
    cursorX: number;
    cursorY: number;
    containerWidth: number;
  } | null>(null);

  const S0 = params.spotPrice;
  const atmIV = params.atmIV;
  const skewSlope = params.skewSlope ?? 0.15;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const xSegments = 36; // Strike steps
    const ySegments = 24; // Expiry steps

    const geometry = new THREE.PlaneGeometry(50, 40, xSegments, ySegments);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const colors: number[] = [];

    const evalSkewIV = (vx: number, vz: number) => {
      const moneyness = (vx / 25) * 0.25; // -25% to +25% OTM
      const days = 10 + ((vz + 20) / 40) * 80;
      const effectiveSlope = skewSlope > 0 ? skewSlope * 2.2 : 0.35;
      const skew = -effectiveSlope * moneyness + 0.6 * moneyness * moneyness;
      const termStructure = 0.04 * Math.log(days / 10);
      const iv = Math.max(0.08, atmIV + skew + termStructure);
      return { moneyness, days, iv };
    };

    // Model classic equity volatility skew (smirk: puts have higher IV than calls, plus term structure)
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      const { iv } = evalSkewIV(vx, vz);

      // Set height
      posAttr.setY(i, (iv - atmIV) * 50);

      // Colormap from blue (lower IV) to orange/red (elevated IV)
      const t = Math.min(1, Math.max(0, (iv - 0.1) / 0.3));
      colors.push(0.1 + 0.9 * t, 0.4 + 0.4 * (1 - t), 0.9 * (1 - t));
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      roughness: 0.25,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const probeGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    probeMesh.visible = false;
    scene.add(probeMesh);

    const gridHelper = new THREE.GridHelper(50, 20, 0x4c9aff, 0x222a35);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Camera orbit controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = cameraPreset === 'top' ? 0 : cameraPreset === 'front' ? 0 : Math.PI / 4;
    let phi = cameraPreset === 'top' ? Math.PI / 2.05 : cameraPreset === 'front' ? 0.15 : Math.PI / 5;
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
          const { moneyness, days, iv } = evalSkewIV(pt.x, pt.z);
          setHoverInfo({
            strike: S0 * (1 + moneyness),
            moneynessPct: moneyness * 100,
            days,
            iv,
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

    const onMouseUp = () => { isDragging = false; };
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

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        theta += 0.0025;
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
  }, [atmIV, skewSlope, wireframe, autoRotate, cameraPreset, S0]);

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
            <div className="label-small" style={{ color: '#94ccff', marginBottom: 4 }}>SVI VOLATILITY PROBE</div>
            <div>Strike: <span className="mono-small">${hoverInfo.strike.toFixed(1)} ({hoverInfo.moneynessPct >= 0 ? '+' : ''}{hoverInfo.moneynessPct.toFixed(1)}%)</span></div>
            <div>Term Horizon: <span className="mono-small">{hoverInfo.days.toFixed(0)} DTE</span></div>
            <div>Implied Vol: <span className="mono-small" style={{ color: '#ffb4ab', fontWeight: 700 }}>{(hoverInfo.iv * 100).toFixed(2)}%</span></div>
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
        Hover to Probe Skew | Drag to Orbit | X: Strike Moneyness | Z: Expiration Term Structure | Y: Implied Volatility
      </div>
    </div>
  );
};
