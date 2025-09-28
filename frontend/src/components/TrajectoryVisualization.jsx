import React, { useState, useEffect } from 'react';
import { robotAPI } from '../services/api';
import { recordEvent } from '../services/api';
import MainScene from './MainScene';

const TrajectoryVisualization = ({ onJointAnglesChange, connectionStatus = false }) => {
  const [trajectory, setTrajectory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [show3DScene, setShow3DScene] = useState(false);
  const [executionSpeed, setExecutionSpeed] = useState(500); // milliseconds between points

  const generateTrajectory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await robotAPI.generateTrajectoryB();
      setTrajectory(response);

      // Record achievement event
      await recordEvent('path_execution');

    } catch (err) {
      setError(err.message);
      console.error('Trajectory generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearTrajectory = () => {
    setTrajectory(null);
    setError(null);
    setShow3DScene(false);
  };

  return (
    <div className="trajectory-visualization" style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <h3 style={{ color: '#333', marginBottom: '15px' }}>
        Trajectory Visualization - Draw Letter B
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={generateTrajectory}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Generating...' : 'Generate Trajectory'}
        </button>

        <button
          onClick={clearTrajectory}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div style={{
          color: '#dc3545',
          backgroundColor: '#f8d7da',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          Error: {error}
        </div>
      )}

      {trajectory && (
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <h4>Trajectory Statistics</h4>
          <p><strong>Total Points:</strong> {trajectory.total_points}</p>
          <p><strong>Successful Points:</strong> {trajectory.successful_points}</p>
          <p><strong>Success Rate:</strong> {((trajectory.successful_points / trajectory.total_points) * 100).toFixed(1)}%</p>

          <h4>Execution Controls</h4>
          <div style={{ marginBottom: '15px' }}>
            <div style={{
              padding: '10px',
              backgroundColor: connectionStatus ? '#d4edda' : '#f8d7da',
              border: `1px solid ${connectionStatus ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              marginBottom: '10px'
            }}>
              <strong>Connection Status:</strong>
              <span style={{ color: connectionStatus ? '#155724' : '#721c24' }}>
                {connectionStatus ? ' ✅ Connected to Robot' : ' ❌ Not Connected - Cannot execute trajectory'}
              </span>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ marginRight: '10px' }}>
                Speed (ms between points):
                <input
                  type="range"
                  min="100"
                  max="3000"
                  value={executionSpeed}
                  onChange={(e) => setExecutionSpeed(Number(e.target.value))}
                  style={{ margin: '0 10px' }}
                />
                {executionSpeed}ms
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={() => setShow3DScene(true)}
                disabled={!connectionStatus || !trajectory}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !connectionStatus ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !connectionStatus ? 'not-allowed' : 'pointer',
                  marginRight: '10px'
                }}
              >
                Execute Full Trajectory
              </button>
            </div>
          </div>

          {/* 3D Scene */}
          {show3DScene && (
            <div style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <h4>3D Robot Animation</h4>
              <MainScene
                trajectory={trajectory ? trajectory.trajectory : null}
                onJointAnglesChange={onJointAnglesChange}
                executionSpeed={executionSpeed}
              />
            </div>
          )}

          <h4>Trajectory Points Preview</h4>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {trajectory.trajectory.slice(0, 10).map((point, index) => (
              <div key={index} style={{
                marginBottom: '5px',
                padding: '5px',
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#f0f0f0',
                border: '1px solid #ddd'
              }}>
                <strong>Point {index}:</strong>
                Position: [{point.position.map(p => p.toFixed(3)).join(', ')}]
                Success: {point.success ? '✓' : '✗'}
              </div>
            ))}
            {trajectory.trajectory.length > 10 && (
              <div style={{ fontStyle: 'italic', color: '#666' }}>
                ... and {trajectory.trajectory.length - 10} more points
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrajectoryVisualization;
