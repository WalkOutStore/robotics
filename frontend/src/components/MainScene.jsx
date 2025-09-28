import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from "@react-three/drei";
import RobotModel from './RobotModel';
import TrajectoryAnimator from './TrajectoryAnimator';

const MainScene = ({ trajectory, onJointAnglesChange, executionSpeed = 500 }) => {
  // **حالة جديدة:** لتخزين زوايا المفاصل الحالية للأنيميشن
  const [currentJointAngles, setCurrentJointAngles] = useState([0, -0.785, 0, -2.356, 0, 1.571, 0.785]);

  // دالة لتحديث الزوايا الحالية وإرسالها للروبوت الحقيقي
  const handleFrameUpdate = (newJointAngles) => {
    setCurrentJointAngles(newJointAngles);
    if (onJointAnglesChange) {
      onJointAnglesChange(newJointAngles);
    }
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50, up: [0, 1, 0] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <gridHelper args={[2, 20, '#64748b', '#94a3b8']} position={[0, -0.01, 0]} />

        {/* 1. مكون الروبوت يستقبل الزوايا الحالية ليعرضها */}
        <RobotModel jointAngles={currentJointAngles} />

        {/* 2. مكون الأنيميشن يستقبل المسار ويقوم بتحديث الزوايا الحالية */}
        {trajectory !== null && trajectory !== undefined && (
          <TrajectoryAnimator
            trajectory={trajectory}
            onFrameUpdate={handleFrameUpdate}
            executionSpeed={executionSpeed}
          />
        )}

        {/* الـ OrbitControls مع إعدادات مناسبة */}
        <OrbitControls
          minDistance={0.5}
          maxDistance={5}
          target={[0, 0.5, 0]}
          enableDamping
          dampingFactor={0.05}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
};

export default MainScene;
