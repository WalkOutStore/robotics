import React, { useState, useEffect, useCallback, memo } from 'react';
import './App.css';
import RobotInfo from './components/RobotInfo';
import { PerformanceStats } from './components/PerformanceStats';
import JointControl from './components/JointControl';
import PathPlanning from './components/PathPlanning';
import RobotViewer from './components/RobotViewer';

import {
  HOME_POSITION,
  checkConnection,
  forwardKinematics,
  calculateWorkspace,
  inverseKinematics,
  recordEvent
} from './services/api';
import WorkspaceViews from './components/WorkspaceVisualization';

// مكونات مثبتة
import AchievementToast from './components/AchievementToast';
import { ThemeSwitcher } from './components/ui/ThemeSwitcher';
import { toast } from 'sonner';
import { VoiceCommand } from './components/VoiceCommand';
import { TrainingMode } from './components/TrainingMode';
import { Toaster } from 'sonner';
import { AchievementsSidebar } from './components/AchievementsSidebar';

const WorkspaceVisualization = memo(WorkspaceViews);
const RobotInfoMemo = memo(RobotInfo);
const JointControlMemo = memo(JointControl);
const PathPlanningMemo = memo(PathPlanning);
const RobotViewerMemo = memo(RobotViewer);

function App() {
  const [jointAngles, setJointAngles] = useState(HOME_POSITION);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [endEffectorPose, setEndEffectorPose] = useState(null);
  const [newAchievement, setNewAchievement] = useState(null);
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [jointAnglesHistory, setJointAnglesHistory] = useState([HOME_POSITION]);
  const [historyPointer, setHistoryPointer] = useState(0);
  const [ikTarget, setIkTarget] = useState({ x: 0.3, y: 0, z: 0.5 });
  const [isCalculating, setIsCalculating] = useState(false);

  // إرسال حدث والحصول على الإنجازات الجديدة
  const triggerEvent = useCallback(async (type, payload = {}) => {
    try {
      const list = await recordEvent(type, payload);
      if (list?.length) {
        const latest = list[0];
        setNewAchievement(latest);
        setTimeout(() => setNewAchievement(null), 4000);
      }
    } catch (e) {
      console.warn('Achievement event failed:', e);
    }
  }, []);

  // FK: حساب وضعية نهاية الذراع عند تغيير المفاصل (تلقائياً)
  const updateFk = useCallback(async (angles) => {
    if (!connectionStatus) return;
    try {
      const { out_of_bounds, position, orientation, transformation_matrix } = await forwardKinematics(angles);
      setEndEffectorPose({ position, orientation, transformation_matrix });
      
      if (out_of_bounds) {
        triggerEvent("fk_out_of_bounds");
        toast.warning("تحذير: زوايا المفاصل خارج الحدود المسموحة!", { duration: 4000 });
      }
    } catch (e) {
      console.error('FK error:', e);
      toast.error(`خطأ في FK: ${e.message}`);
    }
  }, [connectionStatus, triggerEvent]);

  useEffect(() => { 
    updateFk(jointAngles); 
  }, [jointAngles, updateFk]);

  // IK: تنفيذ نقطة واحدة من المسار
  const handlePathExecute = useCallback(async (point) => {
    try {
      const sol = await inverseKinematics(point.position);
      const { out_of_bounds, joint_angles } = sol;
      updateJointAngles(joint_angles);
      triggerEvent("path_execution");
      if (out_of_bounds) {
        triggerEvent("ik_out_of_bounds");
        toast.warning("IK Warning: Target position requires joint angles outside allowed limits!", { duration: 4000 });
      }
    } catch (e) {
      console.error('IK failed:', e);
    }
  }, []);

  // Workspace calculation
  const handleCalcWorkspace = useCallback(async () => {
    setIsCalculating(true);
    const promise = () => new Promise(async (resolve, reject) => {
      try {
        const data = await calculateWorkspace(8000);
        setWorkspace(data);
        triggerEvent('workspace_calculation');
        resolve();
      } catch (e) {
        console.error(e);
        reject(e);
      } finally {
        setIsCalculating(false);
      }
    });
    
    await toast.promise(
      promise(),
      {
        loading: 'جاري حساب مساحة العمل...',
        success: 'تم حساب مساحة العمل بنجاح!',
        error: 'فشل في حساب مساحة العمل.'
      }
    );
  }, [triggerEvent]);

  // حالة الاتصال
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await checkConnection();
      setConnectionStatus(status);
      if (status) {
        updateFk(jointAngles);
        triggerEvent('connected');
      }
    }, 5000);
    checkConnection().then(setConnectionStatus);
    return () => clearInterval(interval);
  }, [jointAngles, updateFk, triggerEvent]);

  // تتبع الحركة الأولى
  useEffect(() => {
    const moved = jointAngles.some((a, i) => Math.abs(a - HOME_POSITION[i]) > 0.05);
    if (moved) triggerEvent('movement');
  }, [jointAngles, triggerEvent]);

  // Helper to update joint angles and history
  const updateJointAngles = useCallback((newAngles) => {
    setJointAngles(newAngles);
    setJointAnglesHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyPointer + 1);
      return [...newHistory, newAngles];
    });
    setHistoryPointer(prevPointer => prevPointer + 1);
  }, [historyPointer]);

  // تغيير المفاصل من أي مكان
  const handleAllJointsChange = useCallback((jointIndex, value) => {
    if (jointIndex === null) {
      updateJointAngles(value);
    } else {
      updateJointAngles(prevAngles => {
        const updatedAngles = [...prevAngles];
        updatedAngles[jointIndex] = value;
        return updatedAngles;
      });
    }
  }, [updateJointAngles]);

  // تتبع العودة للوضعية المنزلية
  const handleHomeReturn = useCallback(() => {
    updateJointAngles(HOME_POSITION);
    triggerEvent("home_return");
  }, [triggerEvent, updateJointAngles]);

  // تطبيق الحركة الأمامية (FK) - تحديث الـ sliders بناءً على الـ end effector position
  const handleApplyFK = useCallback(async () => {
    if (!connectionStatus) {
      toast.error("غير متصل بالروبوت!");
      return;
    }
    
    if (!endEffectorPose?.position) {
      toast.error("لا توجد وضعية نهاية الذراع متاحة!");
      return;
    }
    
    // بدلاً من استدعاء IK على الوضعية الحالية، نجعل زر FK يعيّن هدف IK إلى الوضعية الحالية
    setIkTarget({
      x: endEffectorPose.position[0],
      y: endEffectorPose.position[1],
      z: endEffectorPose.position[2],
    });
    toast.success("تم تعيين هدف IK إلى الموقع الحالي. يمكنك تعديل X/Y/Z ثم الضغط على 'تطبيق IK على الهدف'.");
  }, [connectionStatus, endEffectorPose]);

  // تطبيق الحركة العكسية (IK) - إصلاح المشكلة
  const handleApplyIK = useCallback(async () => {
    if (!connectionStatus) {
      toast.error("غير متصل بالروبوت!");
      return;
    }
    
    const targetPosition = [ikTarget.x, ikTarget.y, ikTarget.z];

    const loadingToast = toast.loading("جاري تطبيق Inverse Kinematics...");
    
    try {
      const sol = await inverseKinematics(targetPosition);
      const { out_of_bounds, joint_angles, success, error } = sol;
      
      toast.dismiss(loadingToast);
      
      if (success) {
        updateJointAngles(joint_angles);
        toast.success(`IK Applied - New angles: [${joint_angles.map(a => a.toFixed(3)).join(', ')}]`, {
          duration: 4000
        });
        triggerEvent("ik_calculation");
      } else {
        toast.error(`IK failed: ${error || 'لم يتم العثور على حل'}`);
      }
      
      if (out_of_bounds) {
        triggerEvent("ik_out_of_bounds");
        toast.warning("IK Warning: Target position requires joint angles outside allowed limits!", { 
          duration: 4000 
        });
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      console.error("IK error:", e);
      toast.error(`خطأ في تطبيق IK: ${e.message}`);
    }
  }, [ikTarget, triggerEvent, updateJointAngles, connectionStatus]);

  // New handler to update IK target
  const handleSetIkTarget = useCallback((newTarget) => {
    setIkTarget(newTarget);
  }, []);

  // استيراد المسار
  const handlePathImport = useCallback((pathData) => {
    console.log('Path imported:', pathData);
    triggerEvent('path_import');
  }, [triggerEvent]);

  // تصدير المسار
  const handlePathExport = useCallback((pathData) => {
    console.log('Path exported:', pathData);
    triggerEvent('path_export');
  }, [triggerEvent]);

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (historyPointer > 0) {
      const prevAngles = jointAnglesHistory[historyPointer - 1];
      setJointAngles(prevAngles);
      setHistoryPointer(prevPointer => prevPointer - 1);
      toast.info("Undo successful.");
    } else {
      toast.info("Nothing to undo.");
    }
  }, [historyPointer, jointAnglesHistory]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (historyPointer < jointAnglesHistory.length - 1) {
      const nextAngles = jointAnglesHistory[historyPointer + 1];
      setJointAngles(nextAngles);
      setHistoryPointer(prevPointer => prevPointer + 1);
      toast.info("Redo successful.");
    } else {
      toast.info("Nothing to redo.");
    }
  }, [historyPointer, jointAnglesHistory]);

  return (
    <>
      <AchievementToast achievement={newAchievement} />
      <Toaster />
      <ThemeSwitcher />
      <VoiceCommand
        onJointChange={handleAllJointsChange}
        onHomeReturn={handleHomeReturn}
        onApplyIK={handleApplyIK}
        highlightedElement={highlightedElement}
      />
      <AchievementsSidebar />
      <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              واجهة التحكم بروبوت Franka Panda
            </h1>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8">
              <RobotInfoMemo
                connectionStatus={connectionStatus}
                robotInfo={{ name: 'Franka Panda', dof: 7 }}
                endEffectorPose={endEffectorPose}
                workspace={workspace}
                onCalcWorkspace={handleCalcWorkspace}
                isCalculating={isCalculating}
                highlightedElement={highlightedElement}
              />
              <PathPlanningMemo 
                onPathExecute={handlePathExecute}
                onPathImport={handlePathImport}
                onPathExport={handlePathExport}
                highlightedElement={highlightedElement}
              />
              <PerformanceStats />
              <TrainingMode
                onStart={() => setIsTrainingMode(true)}
                onEnd={() => setIsTrainingMode(false)}
                onHighlight={setHighlightedElement}
              />
            </div>

            <JointControlMemo
              jointAngles={jointAngles}
              onAllJointsChange={handleAllJointsChange}
              onHomeReturn={handleHomeReturn}
              onApplyFK={handleApplyFK}
              onApplyIK={handleApplyIK}
              onUndo={handleUndo}
              onRedo={handleRedo}
              ikTarget={ikTarget}
              onSetIkTarget={handleSetIkTarget}
              endEffectorPose={endEffectorPose}
              highlightedElement={highlightedElement}
              connectionStatus={connectionStatus} 
            />

            <div className="bg-white rounded-lg shadow-md p-6 h-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">العارض ثلاثي الأبعاد</h2>
              <RobotViewerMemo 
                jointAngles={jointAngles} 
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;