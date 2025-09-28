import React, { useMemo } from 'react';

import { Canvas, useFrame } from "@react-three/fiber";          // أضفنا useFrame
import { OrbitControls, Cylinder, Sphere } from "@react-three/drei";
import * as THREE from 'three';

// --- DH Parameters (ثوابت الروبوت) ---
const DH_PARAMS = [
  { a: 0, d: 0.333, alpha: 0 },
  { a: 0, d: 0, alpha: -Math.PI / 2 },
  { a: 0, d: 0.316, alpha: Math.PI / 2 },
  { a: 0.0825, d: 0, alpha: Math.PI / 2 },
  { a: -0.0825, d: 0.384, alpha: -Math.PI / 2 },
  { a: 0, d: 0, alpha: Math.PI / 2 },
  { a: 0.088, d: 0.107, alpha: Math.PI / 2 },
];

// --- مكون الوصلة (Link) ---
const Link = React.memo(({ start, end }) => {
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec   = useMemo(() => new THREE.Vector3(...end), [end]);

  const length   = startVec.distanceTo(endVec);
  if (length < 0.01) return null;

  const midPoint = useMemo(() => new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5), [startVec, endVec]);
  const quaternion = useMemo(() => {
    const orientation = new THREE.Matrix4();
    orientation.lookAt(startVec, endVec, new THREE.Object3D().up);
    orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    return new THREE.Quaternion().setFromRotationMatrix(orientation);
  }, [startVec, endVec]);

  return (
    <Cylinder args={[0.02, 0.02, length]} position={midPoint.toArray()} quaternion={quaternion.toArray()}>
      <meshStandardMaterial color="#64748b" />
    </Cylinder>
  );
});

// --- مكون الروبوت الكامل ---
function RobotArm({ jointAngles }) {
  const jointPositions = useMemo(() => {
    let currentTransform = new THREE.Matrix4();
    const positions = [new THREE.Vector3(0, 0, 0)];

    jointAngles.forEach((angle, i) => {
      const { a, d, alpha } = DH_PARAMS[i];
      const theta = angle || 0;
      const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta);
      const cosAlpha = Math.cos(alpha), sinAlpha = Math.sin(alpha);

      const T = new THREE.Matrix4().set(
        cosTheta, -sinTheta * cosAlpha,  sinTheta * sinAlpha, a * cosTheta,
        sinTheta,  cosTheta * cosAlpha, -cosTheta * sinAlpha, a * sinTheta,
        0,         sinAlpha,            cosAlpha,            d,
        0,         0,                   0,                   1
      );
      currentTransform.multiply(T);
      positions.push(new THREE.Vector3().setFromMatrixPosition(currentTransform));
    });

    return positions;
  }, [jointAngles]);

  return (
    <group>
      {/* Base */}
      <Cylinder args={[0.1, 0.1, 0.2]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#2563eb" />
      </Cylinder>

      {/* المفاصل */}
      {jointPositions.map((pos, i) => (
        <Sphere key={`joint-${i}`} args={[i === jointPositions.length - 1 ? 0.04 : 0.03]} position={pos.toArray()}>
          <meshStandardMaterial color={i === jointPositions.length - 1 ? "#10b981" : "#dc2626"} />
        </Sphere>
      ))}

      {/* الوصلات */}
      {jointPositions.slice(0, -1).map((pos, i) => (
        <Link key={`link-${i}`} start={pos.toArray()} end={jointPositions[i + 1].toArray()} />
      ))}
    </group>
  );
}

// --- مُحدّث الكاميرا لإيقاف الحركة اللانهائية ---
function CameraUpdater() {
  useFrame((state) => state.controls?.update());
  return null;
}

// --- المكون الرئيسي للعرض ---
const RobotViewer = ({ jointAngles = [0, 0, 0, 0, 0, 0, 0], className = "" }) => {
  return (
    <div
  className={`robot-viewer ${className}`}
  style={{
    width: '100%',
    height: '400px', // ثابت مهما حدث
    background: '#f0f4f8',
    overflow: 'hidden', // منع أي شيء يدفع المحتوى للخارج
  }}
>
      <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50, up: [0, 1, 0] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <gridHelper args={[2, 20, '#64748b', '#94a3b8']} position={[0, -0.01, 0]} />
        <RobotArm jointAngles={jointAngles} />

        {/* الـ OrbitControls مع إعدادات مناسبة لإيقاف الحركة اللانهائية */}
        <OrbitControls
          minDistance={0.5}
          maxDistance={5}
          target={[0, 0.5, 0]}
          enableDamping
          dampingFactor={0.05}
          autoRotate={false}
        />

        {/* المُحدّث الذي يمنع الاستمرار في الحركة */}
        <CameraUpdater />
      </Canvas>
    </div>
  );
};

// export default RobotViewer;
export default React.memo(RobotViewer);