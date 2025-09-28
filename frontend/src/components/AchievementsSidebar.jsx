
import React, { useState, useEffect } from 'react';
import { getUnlockedAchievements } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy } from 'lucide-react';

export function AchievementsSidebar() {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const achievements = await getUnlockedAchievements();
        setUnlockedAchievements(achievements);
      } catch (error) {
        console.error('Error fetching unlocked achievements:', error);
      }
    };

    fetchAchievements();
    const interval = setInterval(fetchAchievements, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="fixed top-1/2 right-4 -translate-y-1/2 z-50 w-64">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          إنجازاتي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-60 overflow-y-auto">
        {unlockedAchievements.length > 0 ? (
          unlockedAchievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <span className="text-xl">{achievement.icon}</span>
              <div>
                <p className="text-sm font-medium">{achievement.title}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد إنجازات بعد. استمر في استخدام الروبوت لفتحها!</p>
        )}
      </CardContent>
    </Card>
  );
}

