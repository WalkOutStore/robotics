import React, { useState, useEffect, useRef } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

// يستقبل onFrameUpdate كـ prop لتحديث الزوايا في المكون الأب
const TrajectoryAnimator = ({ trajectory, onFrameUpdate, executionSpeed = 1000, isExecuting = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (trajectory && currentIndex < trajectory.length) {
      intervalRef.current = setInterval(() => {
        const point = trajectory[currentIndex];

        if (point && point.success) {
          // احصل على الزوايا من المسار
          const { joint_angles } = point;

          // **التغيير الرئيسي:** استدعاء الدالة لتحديث الحالة في المكون الأب
          onFrameUpdate(joint_angles);
        }

        // انتقل إلى النقطة التالية
        setCurrentIndex(prev => {
          if (prev + 1 >= trajectory.length) {
            // انتهى المسار
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return prev;
          }
          return prev + 1;
        });
      }, executionSpeed);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // إيقاف التنفيذ
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [trajectory, executionSpeed, onFrameUpdate]);

  // إعادة تعيين المؤشر عند تغيير المسار
  useEffect(() => {
    setCurrentIndex(0);
  }, [trajectory]);

  // رسم المسار كخط
  if (!trajectory || trajectory.length === 0) return null;

  const points = trajectory.map(p => new THREE.Vector3(...p.position));
  return <Line points={points} color="cyan" lineWidth={3} />;
};

export default TrajectoryAnimator;
