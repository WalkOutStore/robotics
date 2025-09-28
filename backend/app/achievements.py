"""
Achievement system for robot control interface
"""
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
import json
import os

class Achievement(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    points: int
    unlocked: bool = False
    unlock_time: Optional[datetime] = None

class AchievementManager:
    def __init__(self, data_file: str = "achievements.json"):
        self.data_file = data_file
        self.achievements: Dict[str, Achievement] = {}
        self.user_stats = {
            "total_movements": 0,
            "home_returns": 0,
            "workspace_calculations": 0,
            "singularity_encounters": 0,
            "path_executions": 0,
            "session_time": 0,
            "fk_out_of_bounds_count": 0,
            "ik_out_of_bounds_count": 0
        }
        self._initialize_achievements()
        self._load_progress()
    
    def _initialize_achievements(self):
        """Initialize all available achievements"""
        achievements_data = [
            {
                "id": "first_movement",
                "title": "الحركة الأولى",
                "description": "قم بتحريك مفصل الروبوت لأول مرة",
                "icon": "🎯",
                "points": 10
            },
            {
                "id": "home_master",
                "title": "سيد الوضعية المنزلية",
                "description": "عد إلى الوضعية المنزلية 5 مرات",
                "icon": "🏠",
                "points": 25
            },
            {
                "id": "workspace_explorer",
                "title": "مستكشف مساحة العمل",
                "description": "احسب مساحة عمل الروبوت",
                "icon": "🌐",
                "points": 50
            },
            {
                "id": "singularity_survivor",
                "title": "ناجي من التفرد",
                "description": "واجه نقطة تفرد وتجنبها",
                "icon": "⚠️",
                "points": 30
            },
            {
                "id": "path_executor",
                "title": "منفذ المسارات",
                "description": "نفذ مسار كامل بنجاح",
                "icon": "🛤️",
                "points": 40
            },
            {
                "id": "precision_master",
                "title": "سيد الدقة",
                "description": "حرك جميع المفاصل بدقة عالية",
                "icon": "🎯",
                "points": 75
            },
            {
                "id": "endurance_champion",
                "title": "بطل التحمل",
                "description": "استخدم النظام لأكثر من 30 دقيقة",
                "icon": "⏰",
                "points": 60
            },
            {
                "id": "movement_master",
                "title": "سيد الحركة",
                "description": "قم بـ 100 حركة مفصل",
                "icon": "🏃",
                "points": 100
            },
            {
                "id": "fk_out_of_bounds",
                "title": "حدود الحركة الأمامية",
                "description": "أدخل زوايا مفاصل خارج الحدود المسموحة في الحركة الأمامية",
                "icon": "🚫",
                "points": 15
            },
            {
                "id": "ik_out_of_bounds",
                "title": "حدود الحركة العكسية",
                "description": "حاول الوصول إلى وضعية تتطلب زوايا مفاصل خارج الحدود المسموحة في الحركة العكسية",
                "icon": "⚠️",
                "points": 20
            },
            {
                "id": "importer",
                "title": "المستورد",
                "description": "استورد مسارًا بنجاح",
                "icon": "📥",
                "points": 20
            },
            {
                "id": "exporter",
                "title": "المصدر",
                "description": "صدر مسارًا بنجاح",
                "icon": "📤",
                "points": 20
            }
        ]
        
        for data in achievements_data:
            self.achievements[data["id"]] = Achievement(**data)

    
    def _load_progress(self):
        """Load user progress from file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.user_stats.update(data.get('stats', {}))
                    
                    # Update achievement unlock status
                    unlocked = data.get('unlocked_achievements', [])
                    for achievement_id in unlocked:
                        if achievement_id in self.achievements:
                            self.achievements[achievement_id].unlocked = True
                            if achievement_id in data.get('unlock_times', {}):
                                self.achievements[achievement_id].unlock_time = datetime.fromisoformat(
                                    data['unlock_times'][achievement_id]
                                )
            except Exception as e:
                print(f"Error loading achievements: {e}")
    
    def _save_progress(self):
        
        """Save user progress to file"""
        try:
            unlock_times = {}
            for aid, achievement in self.achievements.items():
                if achievement.unlocked and achievement.unlock_time:
                    unlock_times[aid] = achievement.unlock_time.isoformat()
            
            data = {
                'stats': self.user_stats,
                'unlocked_achievements': [
                    aid for aid, achievement in self.achievements.items() 
                    if achievement.unlocked
                ],
                'unlock_times': unlock_times
            }
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving achievements: {e}")
    def record_movement(self) -> List[Achievement]:
        """Record a joint movement and check for achievements"""
        self.user_stats["total_movements"] += 1
        newly_unlocked = []
        
        # Check first movement
        if (not self.achievements["first_movement"].unlocked and 
            self.user_stats["total_movements"] >= 1):
            newly_unlocked.append(self._unlock_achievement("first_movement"))
        
        # Check movement master
        if (not self.achievements["movement_master"].unlocked and 
            self.user_stats["total_movements"] >= 100):
            newly_unlocked.append(self._unlock_achievement("movement_master"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def record_home_return(self) -> List[Achievement]:
        """Record returning to home position"""
        self.user_stats["home_returns"] += 1
        newly_unlocked = []
        
        if (not self.achievements["home_master"].unlocked and 
            self.user_stats["home_returns"] >= 5):
            newly_unlocked.append(self._unlock_achievement("home_master"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def record_workspace_calculation(self) -> List[Achievement]:
        """Record workspace calculation"""
        self.user_stats["workspace_calculations"] += 1
        newly_unlocked = []
        
        if not self.achievements["workspace_explorer"].unlocked:
            newly_unlocked.append(self._unlock_achievement("workspace_explorer"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def record_singularity_encounter(self) -> List[Achievement]:
        """Record encountering a singularity"""
        self.user_stats["singularity_encounters"] += 1
        newly_unlocked = []
        
        if not self.achievements["singularity_survivor"].unlocked:
            newly_unlocked.append(self._unlock_achievement("singularity_survivor"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def record_path_execution(self) -> List[Achievement]:
        """Record path execution"""
        self.user_stats["path_executions"] += 1
        newly_unlocked = []
        
        if not self.achievements["path_executor"].unlocked:
            newly_unlocked.append(self._unlock_achievement("path_executor"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]

    def record_path_import(self) -> List[Achievement]:
        """Record path import"""
        newly_unlocked = []
        if not self.achievements["importer"].unlocked:
            newly_unlocked.append(self._unlock_achievement("importer"))
        self._save_progress()
        return [a for a in newly_unlocked if a]

    def record_path_export(self) -> List[Achievement]:
        """Record path export"""
        newly_unlocked = []
        if not self.achievements["exporter"].unlocked:
            newly_unlocked.append(self._unlock_achievement("exporter"))
        self._save_progress()
        return [a for a in newly_unlocked if a]

    def record_fk_out_of_bounds(self) -> List[Achievement]:
        """Record FK out of bounds event"""
        self.user_stats["fk_out_of_bounds_count"] += 1
        newly_unlocked = []
        if not self.achievements["fk_out_of_bounds"].unlocked:
            newly_unlocked.append(self._unlock_achievement("fk_out_of_bounds"))
        self._save_progress()
        return [a for a in newly_unlocked if a]

    def record_ik_out_of_bounds(self) -> List[Achievement]:
        """Record IK out of bounds event"""
        self.user_stats["ik_out_of_bounds_count"] += 1
        newly_unlocked = []
        if not self.achievements["ik_out_of_bounds"].unlocked:
            newly_unlocked.append(self._unlock_achievement("ik_out_of_bounds"))
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def record_session_time(self, minutes: int) -> List[Achievement]:
        """Record session time"""
        self.user_stats["session_time"] += minutes
        newly_unlocked = []
        
        if (not self.achievements["endurance_champion"].unlocked and 
            self.user_stats["session_time"] >= 30):
            newly_unlocked.append(self._unlock_achievement("endurance_champion"))
        
        self._save_progress()
        return [a for a in newly_unlocked if a]
    
    def _unlock_achievement(self, achievement_id: str) -> Optional[Achievement]:
        """Unlock an achievement"""
        if achievement_id in self.achievements and not self.achievements[achievement_id].unlocked:
            self.achievements[achievement_id].unlocked = True
            self.achievements[achievement_id].unlock_time = datetime.now()
            return self.achievements[achievement_id]
        return None
    
    def get_all_achievements(self) -> List[Achievement]:
        """Get all achievements"""
        return list(self.achievements.values())
    
    def get_unlocked_achievements(self) -> List[Achievement]:
        """Get only unlocked achievements"""
        return [a for a in self.achievements.values() if a.unlocked]
    
    def get_progress_summary(self) -> Dict:
        """Get progress summary"""
        total_achievements = len(self.achievements)
        unlocked_count = len(self.get_unlocked_achievements())
        total_points = sum(a.points for a in self.achievements.values())
        earned_points = sum(a.points for a in self.achievements.values() if a.unlocked)
        
        return {
            "total_achievements": total_achievements,
            "unlocked_achievements": unlocked_count,
            "completion_percentage": (unlocked_count / total_achievements) * 100,
            "total_points": total_points,
            "earned_points": earned_points,
            "stats": self.user_stats
        }

# Global achievement manager instance
achievement_manager = AchievementManager()
