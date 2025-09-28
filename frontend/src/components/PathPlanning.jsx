import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Upload, 
  Plus,
  Trash2,
  BarChart3,
  FileText
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PathPlanning = ({
  onPathExecute,
  onPathImport,
  onPathExport,
  className = "",
  highlightedElement = null
}) => {
  const [pathPoints, setPathPoints] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [showVelocityChart, setShowVelocityChart] = useState(false);
  const [pathType, setPathType] = useState("linear"); // Added for path options
  const [globalAcceleration, setGlobalAcceleration] = useState(0.05); // Added for acceleration settings
  const fileInputRef = useRef(null);

  // --- إضافة / حذف / تعديل النقاط ---
  const addPathPoint = useCallback(() => {
    setPathPoints(prev => [...prev, {
      id: Date.now(),
      position: [0.3, 0.0, 0.5],
      velocity: 0.1,
      acceleration: 0.05,
      timestamp: prev.length * 1.0
    }]);
  }, []);

  const removePathPoint = useCallback((id) => {
    setPathPoints(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePathPoint = useCallback((id, field, value) => {
    setPathPoints(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  }, []);

  // --- استيراد / تصدير ---
  const exportPath = useCallback(() => {
    const pathData = {
      name: `path_${new Date().toISOString().split('T')[0]}`,
      points: pathPoints,
      created: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(pathData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pathData.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onPathExport?.(pathData);
  }, [pathPoints, onPathExport]);

  const importPath = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { points } = JSON.parse(e.target.result);
        if (Array.isArray(points)) {
          setPathPoints(points);
          onPathImport?.({ points });
        }
      } catch (err) {
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
  }, [onPathImport]);

  // --- تشغيل المسار مع تنفيذ تدريجي (IK) ---
  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (!pathPoints.length) return;

    setIsPlaying(true);
    for (let i = 0; i < pathPoints.length; i++) {
      if (!isPlaying) break; // أيقاف مبكر
      const pt = pathPoints[i];
      setCurrentPoint(i);
      onPathExecute?.(pt); // نمرر نقطة واحدة فقط
      await new Promise(r => setTimeout(r, 400)); // تأخير 400 ملم بين النقط
    }
    setIsPlaying(false);
  }, [isPlaying, pathPoints, onPathExecute]);

  // --- بيانات الرسم البياني ---
  const chartData = pathPoints.map((p, i) => ({
    time: p.timestamp,
    velocity: p.velocity,
    acceleration: p.acceleration,
    point: i + 1
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>تخطيط المسار</span>
          <Badge variant="outline">{pathPoints.length} نقطة</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Path Options and Global Acceleration */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">نوع المسار:</label>
            <div className="flex gap-2">
              <Button
                variant={pathType === "linear" ? "default" : "outline"}
                size="sm"
                onClick={() => setPathType("linear")}
              >
                خطي
              </Button>
              <Button
                variant={pathType === "curved" ? "default" : "outline"}
                size="sm"
                onClick={() => setPathType("curved")}
              >
                منحني
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">التسارع العالمي (m/s²):</label>
            <input
              type="number"
              step={0.01}
              min={0.01}
              value={globalAcceleration}
              onChange={(e) => setGlobalAcceleration(parseFloat(e.target.value) || 0.01)}
              className="w-24 px-2 py-1 text-sm border rounded ltr-content"
            />
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2">
          <Button onClick={addPathPoint} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> إضافة نقطة
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> استيراد
          </Button>
          <Button variant="outline" size="sm" onClick={exportPath} disabled={!pathPoints.length} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> تصدير
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept=".json" onChange={importPath} className="hidden" />

        {/* قائمة النقاط */}
        {pathPoints.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {pathPoints.map((point, i) => (
              <div key={point.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">نقطة {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removePathPoint(point.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* تعديل الموضع */}
                <div className="grid grid-cols-3 gap-2">
                  {['X','Y','Z'].map((axis, idx) => (
                    <div key={axis} className="space-y-1">
                      <label className="text-xs text-muted-foreground ltr-content">{axis} (m)</label>
                      <input
                        type="number"
                        step={0.01}
                        value={point.position[idx]}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          updatePathPoint(point.id, 'position', point.position.map((p, j) => j === idx ? v : p));
                        }}
                        className="w-full px-2 py-1 text-xs border rounded ltr-content"
                      />
                    </div>
                  ))}
                </div>

                {/* السرعة والتسارع */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">السرعة (m/s)</label>
                    <input type="number" step={0.01} min={0} value={point.velocity}
                      onChange={e => updatePathPoint(point.id, 'velocity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border rounded ltr-content" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">التسارع (m/s²)</label>
                    <input type="number" step={0.01} min={0} value={point.acceleration}
                      onChange={e => updatePathPoint(point.id, 'acceleration', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border rounded ltr-content" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* أزرار التشغيل والمؤشر */}
        {pathPoints.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className={`relative w-16 h-16 ${highlightedElement === 'highlight_path_planning_ik' ? 'ring-4 ring-yellow-400 rounded-full' : ''}`}>
                <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-300"
                    strokeWidth="5"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                  />
                  {isPlaying && (
                    <circle
                      className="text-primary transition-all duration-300 ease-linear"
                      strokeWidth="5"
                      strokeDasharray="282.74"
                      strokeDashoffset={282.74 - (currentPoint / pathPoints.length) * 282.74}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      transform="rotate(-90 50 50)"
                    />
                  )}
                </svg>
                <Button
                  onClick={togglePlayback}
                  disabled={!pathPoints.length}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
              </div>
              <Button variant="outline" onClick={() => { setIsPlaying(false); setCurrentPoint(0); }} className="flex items-center gap-2">
                <Square className="w-4 h-4" /> إيقاف
              </Button>
              <Button variant="outline" onClick={() => setShowVelocityChart(v => !v)} className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> الرسم البياني
              </Button>
            </div>

            {isPlaying && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>التقدم</span>
                  <span>{currentPoint + 1} / {pathPoints.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all"
                       style={{ width: `${((currentPoint + 1) / pathPoints.length) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* رسم السرعة / التسارع */}
        {showVelocityChart && pathPoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">السرعة والتسارع</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" label={{ value: 'الزمن (ثانية)', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip formatter={(v, name) => [v.toFixed(3), name === 'velocity' ? 'السرعة (m/s)' : 'التسارع (m/s²)']} />
                  <Line type="monotone" dataKey="velocity" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="acceleration" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* حالة فارغة */}
        {pathPoints.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد نقاط مسار</p>
            <p className="text-xs">أضف نقاط لبدء تخطيط المسار</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PathPlanning;