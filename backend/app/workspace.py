# workspace.py

import numpy as np
from typing import List, Tuple
import random
from .kinematics import FrankaPandaKinematicsMatlab
class WorkspaceCalculator:
    """
    فئة لحساب مساحة عمل روبوت Franka Panda باستخدام محاكاة مونت كارلو
    مع مراعاة الحدود الرسمية من ورقة البيانات
    """
    
    def __init__(self):
        """تهيئة حاسبة مساحة العمل"""
        self.kinematics = FrankaPandaKinematicsMatlab()
        self.max_reach = self.kinematics.max_reach  # 855 mm
        
    def generate_random_joint_angles(self) -> List[float]:
        """
        توليد زوايا مفاصل عشوائية ضمن الحدود المسموحة
        
        Returns:
            قائمة من 7 زوايا عشوائية للمفاصل
        """
        joint_angles = []
        
        for i in range(7):
            min_angle = self.kinematics.joint_limits[i][0]
            max_angle = self.kinematics.joint_limits[i][1]
            random_angle = random.uniform(min_angle, max_angle)
            joint_angles.append(random_angle)
        
        return joint_angles
    
    def calculate_workspace(self, num_samples: int = 10000) -> Tuple[List[List[float]], int]:
        """
        حساب مساحة عمل الروبوت باستخدام محاكاة مونت كارلو
        مع مراعاة الحد الأقصى للوصول (855 مم)
        
        Args:
            num_samples: عدد العينات العشوائية لتوليدها
            
        Returns:
            tuple: (سحابة النقاط ثلاثية الأبعاد, عدد النقاط الصالحة)
        """
        if num_samples < 1000:
            raise ValueError("عدد العينات يجب أن يكون على الأقل 1000")
        
        if num_samples > 100000:
            raise ValueError("عدد العينات يجب ألا يتجاوز 100000")
        
        point_cloud = []
        valid_points = 0
        
        for _ in range(num_samples):
            try:
                # توليد زوايا مفاصل عشوائية
                joint_angles = self.generate_random_joint_angles()
                
                # حساب الحركة الأمامية للحصول على موقع نهاية الذراع
                T_matrix, position, orientation, out_of_bounds = self.kinematics.forward_kinematics(joint_angles)
                
                # التحقق من أن الموقع صالح (ليس NaN أو Inf) وفي نطاق الوصول
                if (np.all(np.isfinite(position)) and 
                    np.linalg.norm(position) <= self.max_reach and
                    not out_of_bounds):
                    point_cloud.append(position.tolist())
                    valid_points += 1
                    
            except Exception as e:
                # تجاهل النقاط التي تسبب أخطاء
                continue
        
        return point_cloud, valid_points
    
    def calculate_workspace_bounds(self, point_cloud: List[List[float]]) -> dict:
        """
        حساب حدود مساحة العمل مع مراعاة الحد الأقصى للوصول
        
        Args:
            point_cloud: سحابة النقاط ثلاثية الأبعاد
            
        Returns:
            قاموس يحتوي على الحدود الدنيا والعليا لكل محور
        """
        if not point_cloud:
            return {"x": [0.0, 0.0], "y": [0.0, 0.0], "z": [0.0, 0.0]}
        
        points_array = np.array(point_cloud)
        
        # تطبيق قيود الحد الأقصى للوصول
        distances = np.linalg.norm(points_array, axis=1)
        valid_points = points_array[distances <= self.max_reach]
        
        if len(valid_points) == 0:
            return {"x": [0.0, 0.0], "y": [0.0, 0.0], "z": [0.0, 0.0]}
        
        bounds = {
            "x": [float(np.min(valid_points[:, 0])), float(np.max(valid_points[:, 0]))],
            "y": [float(np.min(valid_points[:, 1])), float(np.max(valid_points[:, 1]))],
            "z": [float(np.min(valid_points[:, 2])), float(np.max(valid_points[:, 2]))]
        }
        
        return bounds
    
    def calculate_workspace_volume(self, point_cloud: List[List[float]]) -> float:
        """
        تقدير حجم مساحة العمل باستخدام convex hull
        مع مراعاة الحد الأقصى للوصول (855 مم)
        
        Args:
            point_cloud: سحابة النقاط ثلاثية الأبعاد
            
        Returns:
            الحجم التقديري لمساحة العمل
        """
        if len(point_cloud) < 4:
            return 0.0
        
        try:
            from scipy.spatial import ConvexHull
            points_array = np.array(point_cloud)
            
            # تطبيق قيود الحد الأقصى للوصول
            distances = np.linalg.norm(points_array, axis=1)
            valid_points = points_array[distances <= self.max_reach]
            
            if len(valid_points) < 4:
                return 0.0
                
            hull = ConvexHull(valid_points)
            return float(hull.volume)
        except ImportError:
            # إذا لم تكن scipy متاحة، استخدم تقدير بسيط
            bounds = self.calculate_workspace_bounds(point_cloud)
            volume = (bounds["x"][1] - bounds["x"][0]) * \
                    (bounds["y"][1] - bounds["y"][0]) * \
                    (bounds["z"][1] - bounds["z"][0])
            return float(volume)
        except Exception:
            return 0.0
    
    def filter_workspace_by_region(self, point_cloud: List[List[float]], 
                                 region: str = "reachable") -> List[List[float]]:
        """
        تصفية مساحة العمل حسب المنطقة مع مراعاة الحد الأقصى للوصول
        
        Args:
            point_cloud: سحابة النقاط ثلاثية الأبعاد
            region: نوع المنطقة ("reachable", "dexterous", "safe")
            
        Returns:
            سحابة النقاط المصفاة
        """
        if not point_cloud:
            return []
        
        points_array = np.array(point_cloud)
        filtered_points = []
        
        # تطبيق قيود الحد الأقصى للوصول أولاً
        distances = np.linalg.norm(points_array, axis=1)
        valid_points = points_array[distances <= self.max_reach]
        
        for point in valid_points:
            x, y, z = point
            
            if region == "reachable":
                # جميع النقاط القابلة للوصول ضمن الحد الأقصى
                filtered_points.append(point.tolist())
                
            elif region == "dexterous":
                # النقاط التي يمكن الوصول إليها بمرونة عالية
                # (النقاط القريبة من مركز مساحة العمل ولكن ضمن الحد الأقصى)
                distance_from_base = np.sqrt(x**2 + y**2 + z**2)
                if 0.3 <= distance_from_base <= 0.7:
                    filtered_points.append(point.tolist())
                    
            elif region == "safe":
                # النقاط الآمنة (بعيدة عن حدود المفاصل والحد الأقصى)
                # هذا يتطلب فحص إضافي للتأكد من أن المفاصل ليست قريبة من حدودها
                filtered_points.append(point.tolist())
        
        return filtered_points
    
    # FIX: This function is now correctly indented to be a method of the class.
    def get_workspace_stats(self, point_cloud: List[List[float]]) -> dict:
        """
        الحصول على إحصائيات مساحة العمل بما في ذلك الحد الأقصى للوصول
        """
        if not point_cloud:
            return {
                "max_reach": self.max_reach,
                "volume": 0.0,
                "bounds": {"x": [0.0, 0.0], "y": [0.0, 0.0], "z": [0.0, 0.0]},
                "point_count": 0
            }
        
        points_array = np.array(point_cloud)
        
        # Calculate bounds
        bounds = {
            "x": [float(np.min(points_array[:, 0])), float(np.max(points_array[:, 0]))],
            "y": [float(np.min(points_array[:, 1])), float(np.max(points_array[:, 1]))],
            "z": [float(np.min(points_array[:, 2])), float(np.max(points_array[:, 2]))]
        }
        
        # Calculate volume (simplified approximation)
        volume = (bounds["x"][1] - bounds["x"][0]) * \
                 (bounds["y"][1] - bounds["y"][0]) * \
                 (bounds["z"][1] - bounds["z"][0])
        
        return {
            "max_reach": float(self.max_reach),
            "volume": float(volume),
            "bounds": bounds,
            "point_count": len(point_cloud)
        }