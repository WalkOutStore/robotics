import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle } from 'lucide-react';
// --- استيراد الثوابت مباشرة من ملف API ---
import { JOINT_LIMITS, JOINT_NAMES, HOME_POSITION } from '../services/api';

const JointControl = ({
  jointAngles,
  onAllJointsChange, // دالة لتغيير كل الزوايا مرة واحدة
  onHomeReturn, // دالة للعودة للوضعية المنزلية
  onApplyFK, // دالة لتطبيق الحركة الأمامية
  onApplyIK, // دالة لتطبيق الحركة العكسية
  onUndo, // دالة للتراجع
  onRedo, // دالة للإعادة
  ikTarget, // New: IK target state
  onSetIkTarget, // New: Handler to set IK target
  endEffectorPose, // New: To get current pose
  singularityStatus = null,
  className = "",
  highlightedElement = null
}) => {

  const isNearLimit = (jointIndex, angle) => {
    const [min, max] = JOINT_LIMITS[jointIndex];
    const range = max - min;
    const threshold = range * 0.1;
    return (angle - min) < threshold || (max - angle) < threshold;
  };

  const isOutOfLimits = (jointIndex, angle) => {
    const [min, max] = JOINT_LIMITS[jointIndex];
    return angle < min || angle > max;
  };

  const radToDeg = (rad) => (rad * 180 / Math.PI).toFixed(1);

  // دالة لتغيير زاوية مفصل واحد واستدعاء الدالة الأم
  const handleSingleJointChange = (index, value) => {
    onAllJointsChange(index, value);
  };

  return (
    <Card className={`${className} ${highlightedElement === 'highlight_joint_control' ? 'ring-4 ring-yellow-400' : ''}`}>
      <CardHeader>
        <CardTitle>التحكم اليدوي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IK Target Inputs */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
          <h4 className="text-sm font-semibold">هدف الحركة العكسية (IK Target)</h4>
          <div className="grid grid-cols-3 gap-2 items-center">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis}>
                <label className="text-xs font-mono uppercase">{axis}</label>
                <input
                  type="number"
                  step={0.01}
                  value={ikTarget[axis]}
                  onChange={(e) => onSetIkTarget({ ...ikTarget, [axis]: parseFloat(e.target.value) })}
                  className="w-full p-1 border rounded-md text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              if (endEffectorPose?.position) {
                onSetIkTarget({
                  x: endEffectorPose.position[0],
                  y: endEffectorPose.position[1],
                  z: endEffectorPose.position[2],
                });
                // toast.success('تم نسخ الموقع الحالي إلى الهدف');
              } else {
                // toast.error('لا يوجد موقع حالي لنسخه');
              }
            }}
            className="w-full mt-2 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            استخدام الموقع الحالي كهدف
          </button>
        </div>

        {jointAngles.map((angle, index) => {
          const [minLimit, maxLimit] = JOINT_LIMITS[index];
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{JOINT_NAMES[index]}</label>
                <span className="text-sm font-mono ltr-content">{radToDeg(angle)}°</span>
              </div>
              <input
                type="range"
                min={minLimit}
                max={maxLimit}
                step={0.01}
                value={angle}
                onChange={(e) => handleSingleJointChange(index, parseFloat(e.target.value))}
                className="w-full"
                style={{ direction: 'ltr' }}
              />
              <div className="flex justify-between text-xs text-gray-500" style={{ direction: 'ltr' }}>
                <span>{radToDeg(minLimit)}°</span>
                <span>{radToDeg(maxLimit)}°</span>
              </div>
            </div>
          );
        })}
        
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={onHomeReturn}
            className={`flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 ${highlightedElement === 'highlight_home_button' ? 'ring-4 ring-yellow-400' : ''}`}
          >
            الوضعية المنزلية
          </button>
          
          <button
              onClick={() => onAllJointsChange(null, HOME_POSITION)}
              className="flex-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              إعادة تعيين المفاصل
            </button>
        
          <button
            onClick={onApplyIK}
            className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            تطبيق IK على الهدف
          </button>
          <button
            onClick={onUndo}
            className="flex-1 px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            تراجع
          </button>
          <button
            onClick={onRedo}
            className="flex-1 px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            إعادة
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JointControl;
