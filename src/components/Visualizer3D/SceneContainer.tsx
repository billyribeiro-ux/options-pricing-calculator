import React, { useState } from 'react';
import { PayoffSurface3D } from './PayoffSurface3D';
import { VolatilitySurface3D } from './VolatilitySurface3D';
import { IronCondorEvaluation, UnderlyingParams } from '../../quant/types';
import { Box, Layers, Play, Pause, Eye } from 'lucide-react';

export type CameraPreset = 'iso' | 'top' | 'front';

interface SceneContainerProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

export const SceneContainer: React.FC<SceneContainerProps> = ({ condorEval, params }) => {
  const [activeTab, setActiveTab] = useState<'payoff' | 'volatility'>('payoff');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');

  return (
    <div className="md-card md-card--elevated" style={{ height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <div className="md-card__header" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="md-card__title">
            <Box size={18} color="var(--md-sys-color-primary)" />
            GPU-Accelerated 3D Interactive Graphics
          </h3>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${activeTab === 'payoff' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setActiveTab('payoff')}
            >
              P&L Payoff Landscape
            </button>
            <button
              className={`md-segmented-button__segment ${activeTab === 'volatility' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setActiveTab('volatility')}
            >
              Volatility Skew Surface
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${cameraPreset === 'iso' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => { setCameraPreset('iso'); setAutoRotate(false); }}
              title="Isometric 3D View"
            >
              <Eye size={12} style={{ marginRight: 4 }} />
              3D Iso
            </button>
            <button
              className={`md-segmented-button__segment ${cameraPreset === 'top' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => { setCameraPreset('top'); setAutoRotate(false); }}
              title="Top-Down Contour View"
            >
              Top Contour
            </button>
            <button
              className={`md-segmented-button__segment ${cameraPreset === 'front' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => { setCameraPreset('front'); setAutoRotate(false); }}
              title="Front Expiration Profile"
            >
              Expiry Profile
            </button>
          </div>

          <button
            className={`md-button ${wireframe ? 'md-button--tonal' : 'md-button--outlined'}`}
            onClick={() => setWireframe(!wireframe)}
            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
          >
            <Layers size={14} />
            <span>Wireframe</span>
          </button>

          <button
            className={`md-button ${autoRotate ? 'md-button--tonal' : 'md-button--outlined'}`}
            onClick={() => setAutoRotate(!autoRotate)}
            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
          >
            {autoRotate ? <Pause size={14} /> : <Play size={14} />}
            <span>Rotate</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'payoff' ? (
          <PayoffSurface3D
            condorEval={condorEval}
            params={params}
            wireframe={wireframe}
            autoRotate={autoRotate}
            cameraPreset={cameraPreset}
          />
        ) : (
          <VolatilitySurface3D
            params={params}
            wireframe={wireframe}
            autoRotate={autoRotate}
            cameraPreset={cameraPreset}
          />
        )}
      </div>
    </div>
  );
};
