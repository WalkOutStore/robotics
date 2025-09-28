import React from 'react';
import MainScene from './MainScene';

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
        position: 'relative'
      }}
    >
      <MainScene />
    </div>
  );
};

export default React.memo(RobotViewer);