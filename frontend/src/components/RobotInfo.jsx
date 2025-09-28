import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Bot, Settings, Activity, AlertCircle, CheckCircle, Layers } from 'lucide-react';
import WorkspaceVisualization from './WorkspaceVisualization';

const RobotInfo = ({
  connectionStatus = false,
  robotInfo = null,
  endEffectorPose = null,
  workspace = null,
  onCalcWorkspace = null,
  className = "",
  highlightedElement = null,
  isCalculating = false
  
}) => {

  const formatPosition = (value) => {
    return typeof value === 'number' ? value.toFixed(3) : '0.000';
  };
  const [showVisualization, setShowVisualization] = useState(false);
  const formatQuaternion = (quat) => {
    if (!quat || !Array.isArray(quat) || quat.length !== 4) {
      return { w: '0.000', x: '0.000', y: '0.000', z: '0.000' };
    }
    return {
      w: quat[0].toFixed(3),
      x: quat[1].toFixed(3),
      y: quat[2].toFixed(3),
      z: quat[3].toFixed(3)
    };
  };
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const formatArray = (arr) => arr.map(n => n.toFixed(3)).join(', ');
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          معلومات الروبوت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            {connectionStatus ? (
              <Wifi className="w-4 h-4 status-connected" />
            ) : (
              <WifiOff className="w-4 h-4 status-disconnected" />
            )}
            <span className="text-sm font-medium">حالة الاتصال</span>
          </div>
          <Badge
            variant={connectionStatus ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {connectionStatus ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {connectionStatus ? "متصل" : "غير متصل"}
          </Badge>
        </div>

        {/* Robot Basic Info */}
        {robotInfo && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              المواصفات الأساسية
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الاسم:</span>
                <span className="font-medium">{robotInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">درجات الحرية:</span>
                <span className="font-medium">{robotInfo.dof}</span>
              </div>
            </div>
          </div>
        )}

        {/* End Effector Position */}
        {endEffectorPose && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              وضعية نهاية الذراع
            </h4>

            {/* Position */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">الموقع (متر):</span>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono ltr-content">
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">X</div>
                  <div>{formatPosition(endEffectorPose.position?.[0])}</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">Y</div>
                  <div>{formatPosition(endEffectorPose.position?.[1])}</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">Z</div>
                  <div>{formatPosition(endEffectorPose.position?.[2])}</div>
                </div>
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">الاتجاه (Quaternion):</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono ltr-content">
                {(() => {
                  const quat = formatQuaternion(endEffectorPose.orientation);
                  return (
                    <>
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-muted-foreground">W</div>
                        <div>{quat.w}</div>
                      </div>
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-muted-foreground">X</div>
                        <div>{quat.x}</div>
                      </div>
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-muted-foreground">Y</div>
                        <div>{quat.y}</div>
                      </div>
                      <div className="bg-muted p-2 rounded text-center">
                        <div className="text-muted-foreground">Z</div>
                        <div>{quat.z}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Workspace section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4" />
            مساحة العمل
          </h4>
          {workspace ? (
            <WorkspaceVisualization pointCloud={workspace.point_cloud} />
          ) : (
            <p className="text-sm text-gray-500">لم يتم حسابها بعد.</p>
        )}
          <button
            onClick={onCalcWorkspace}
            disabled={isCalculating} 
            className={`w-full px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 ${highlightedElement === 'highlight_workspace_button' ? 'ring-4 ring-yellow-400' : ''}`}
          >
            {isCalculating ? (
            <>
              <Spinner />
              <span>جاري الحساب...</span>
            </>
          ) : (
            <span>احسب مساحة العمل</span>
          )}
            
          </button>
          

          {workspace && workspace.bounds && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>الأبعاد (متر):</div>
              <div className="grid grid-cols-3 gap-2 font-mono ltr-content">
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">X</div>
                  <div>[{workspace.bounds.x[0]?.toFixed(3)},{workspace.bounds.x[1]?.toFixed(3)}]</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">Y</div>
                  <div>[{workspace.bounds.y.min},{workspace.bounds.y.max}]</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">Z</div>
                  <div>[{workspace.bounds.z.min},{workspace.bounds.z.max}]</div>
                </div>
              </div>
              <div className="pt-1">عدد العيّنات: {workspace.sample_count ?? '—'}</div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex gap-2">
          <div className={`flex-1 p-2 rounded-lg text-center text-xs ${connectionStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            <div className="font-medium">الخدمة</div>
            <div>{connectionStatus ? 'نشطة' : 'متوقفة'}</div>
          </div>

          <div className="flex-1 p-2 rounded-lg text-center text-xs bg-blue-100 text-blue-800">
            <div className="font-medium">الوضع</div>
            <div>محاكاة</div>
          </div>
        </div>

        {/* Logo/Branding */}
        <div className="text-center pt-2 border-t">
          <div className="text-lg font-bold text-primary">Franka Panda</div>
          <div className="text-xs text-muted-foreground">واجهة التحكم التفاعلية</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RobotInfo;