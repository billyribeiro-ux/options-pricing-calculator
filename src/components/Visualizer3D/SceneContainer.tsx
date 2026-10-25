import React, { useState } from 'react';
import { PayoffSurface3D } from './PayoffSurface3D';
import { VolatilitySurface3D } from './VolatilitySurface3D';
import { IronCondorEvaluation, UnderlyingParams } from '../../quant/types';
import { Box, Layers, Play, Pause } from 'lucide-react';

interface SceneContainerProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

export const SceneContainer: React.FC<SceneContainerProps> = ({ condorEval, params }) => {
  const [activeTab, setActiveTab] = useState<'payoff' | 'volatility'>('payoff');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  return (
    <div className="md-card md-card--elevated" style={{ height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <div className="md-card__header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          />
        ) : (
          <VolatilitySurface3D
            params={params}
            wireframe={wireframe}
            autoRotate={autoRotate}
          />
        )}
      </div>
    </div>
  );
};
