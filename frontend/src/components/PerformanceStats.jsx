
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getAchievementsProgress } from '../services/api';

export function PerformanceStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const progress = await getAchievementsProgress();
        setStats(progress.stats);
      } catch (error) {
        console.error('Error fetching performance stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <p>تحميل الإحصائيات...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إحصائيات الأداء</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500">إجمالي الحركات:</span>
          <span className="font-semibold">{stats.total_movements}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">العودة للوضعية المنزلية:</span>
          <span className="font-semibold">{stats.home_returns}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">حسابات مساحة العمل:</span>
          <span className="font-semibold">{stats.workspace_calculations}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">مواجهات التفرد:</span>
          <span className="font-semibold">{stats.singularity_encounters}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">تنفيذ المسارات:</span>
          <span className="font-semibold">{stats.path_executions}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">وقت الجلسة (دقائق):</span>
          <span className="font-semibold">{stats.session_time}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">FK خارج الحدود:</span>
          <span className="font-semibold">{stats.fk_out_of_bounds_count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">IK خارج الحدود:</span>
          <span className="font-semibold">{stats.ik_out_of_bounds_count}</span>
        </div>
      </CardContent>
    </Card>
  );
}

