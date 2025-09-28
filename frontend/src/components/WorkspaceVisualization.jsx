import React, { useRef, useEffect } from 'react';

const WorkspaceVisualization = ({ pointCloud, className = "" }) => {
  const topViewRef = useRef(null);
  const sideViewRef = useRef(null);

  useEffect(() => {
    if (!pointCloud || pointCloud.length === 0) return;

    // رسم المنظر العلوي (XY)
    drawView(topViewRef.current, pointCloud, 'xy');
    
    // رسم المنظر الجانبي (XZ)
    drawView(sideViewRef.current, pointCloud, 'xz');
  }, [pointCloud]);

  const drawView = (canvas, points, viewType) => {
    if (!canvas || !points) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // مسح Canvas
    ctx.clearRect(0, 0, width, height);
    
    // إعداد نظام الإحداثيات
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(1, -1); // لجعل المحور Y موجهاً للأعلى
    
    // تحديد نطاق البيانات
    let xValues = points.map(p => p[0]);
    let yValues, zValues;
    
    if (viewType === 'xy') {
      yValues = points.map(p => p[1]);
    } else {
      yValues = points.map(p => p[2]); // في المنظر الجانبي، نستخدم Z مكان Y
    }
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // عامل التحجيم لملاءمة Canvas
    const scale = Math.min(width / (xMax - xMin), height / (yMax - yMin)) * 0.8;
    
    // رسم المحاور
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    // المحور X
    ctx.beginPath();
    ctx.moveTo(-width/2, 0);
    ctx.lineTo(width/2, 0);
    ctx.stroke();
    
    // المحور Y
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(0, height/2);
    ctx.stroke();
    
    // رسم النقاط
    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'; // لون أزرق شفاف
    points.forEach(point => {
      const x = point[0] * scale;
      const y = viewType === 'xy' ? point[1] * scale : point[2] * scale;
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
    
    // إضافة التسميات
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    if (viewType === 'xy') {
      ctx.fillText('X (m)', width / 2, height - 10);
      ctx.save();
      ctx.translate(10, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Y (m)', 0, 0);
      ctx.restore();
    } else {
      ctx.fillText('X (m)', width / 2, height - 10);
      ctx.save();
      ctx.translate(10, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Z (m)', 0, 0);
      ctx.restore();
    }
  };

  if (!pointCloud || pointCloud.length === 0) {
    return (
      <div className={`text-center p-4 text-gray-500 ${className}`}>
        <p>لا توجد بيانات لمساحة العمل</p>
        <p className="text-sm">اضغط على "حساب مساحة العمل" لإنشاء الرسوم</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h4 className="text-sm font-medium mb-2">المنظر العلوي (XY)</h4>
        <canvas 
          ref={topViewRef} 
          width={300} 
          height={200}
          className="border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">المنظر الجانبي (XZ)</h4>
        <canvas 
          ref={sideViewRef} 
          width={300} 
          height={200}
          className="border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default WorkspaceVisualization;