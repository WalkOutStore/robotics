# kinematics_matlab.py - Updated with MATLAB Engine integration
import numpy as np
import matlab.engine
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class FrankaPandaKinematicsMatlab:
    def __init__(self):
        """تهيئة كائن الحركة مع MATLAB Engine"""
        # بدء محرك MATLAB
        try:
            print("Starting MATLAB engine...")
            self.matlab_eng = matlab.engine.start_matlab()
            print("MATLAB engine started successfully.")
            # إضافة مسار ملفات MATLAB
            self.matlab_eng.addpath(r'C:\Users\Lenovo\Desktop\Level_4\Robotics\Lab')
            print("MATLAB path added.")
            print("Creating reusable MATLAB robot model...")
            self.robot_model = self.matlab_eng.create_panda_robot()
            print("MATLAB robot model created successfully.")
            self.python_kinematics = None  # No fallback needed when MATLAB works
        except Exception as e:
            print(f"Error starting MATLAB engine or adding path: {e}")
            print("Falling back to Python implementation...")
            # استخدام النسخة Python كـ fallback
            from .kinematics_python import FrankaPandaKinematicsPython
            self.python_kinematics = FrankaPandaKinematicsPython()
            self.matlab_eng = None
            
        # Official joint limits from Franka Panda datasheet (in radians)
        self.joint_limits = np.array([
            [-2.8973, 2.8973],    # Joint 1: ±166°
            [-1.7628, 1.7628],    # Joint 2: ±101°
            [-2.8973, 2.8973],    # Joint 3: ±166°
            [-3.0718, -0.0698],   # Joint 4: -176° to -4° (unique range)
            [-2.8973, 2.8973],    # Joint 5: ±166°
            [-0.0175, 3.7525],    # Joint 6: -1° to 215° (unique range)
            [-2.8973, 2.8973]     # Joint 7: ±166°
        ])
        
        # Maximum reach from base (855 mm)
        self.max_reach = 0.855

    def __del__(self):
        """إغلاق MATLAB Engine عند إنهاء الكائن"""
        if hasattr(self, 'matlab_eng') and self.matlab_eng is not None:
            try:
                self.matlab_eng.quit()
                print("تم إغلاق MATLAB Engine")
            except:
                pass

    def forward_kinematics_matlab(self, joint_angles: List[float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
        """
        حساب الحركة الأمامية باستخدام MATLAB
        
        Args:
            joint_angles: زوايا المفاصل السبعة
            
        Returns:
            T_total (4x4), position (3,), orientation quaternion [w,x,y,z], out_of_bounds (bool)
        """
        if len(joint_angles) != 7:
            raise ValueError("Expected 7 joint angles")

        # التحقق من حدود المفاصل
        out_of_bounds = False
        for i, angle in enumerate(joint_angles):
            if angle < self.joint_limits[i][0] or angle > self.joint_limits[i][1]:
                out_of_bounds = True
                break

        if self.matlab_eng is None:
            # استخدام Python كـ fallback
            return self.python_kinematics.forward_kinematics(joint_angles)

        try:
            # تحويل زوايا المفاصل إلى تنسيق MATLAB
            matlab_angles = matlab.double(joint_angles)
            
            # استدعاء دالة MATLAB للحركة الأمامية
            # افتراض أن لديك دالة panda_fk في MATLAB
            T_matlab = self.matlab_eng.panda_fk(self.robot_model, matlab_angles)

            
            # تحويل النتيجة من MATLAB إلى NumPy
            T_total = np.array(T_matlab)
            
            # استخراج الموقع والاتجاه
            position = T_total[:3, 3].copy()
            rotation_matrix = T_total[:3, :3].copy()
            orientation = self.rotation_matrix_to_quaternion(rotation_matrix)
            
            return T_total, position, orientation, out_of_bounds
            
        except Exception as e:
            logger.error(f"خطأ في MATLAB forward kinematics: {e}")
            # استخدام Python كـ fallback
            if hasattr(self, 'python_kinematics'):
                return self.python_kinematics.forward_kinematics(joint_angles)
            else:
                raise e

    def inverse_kinematics_matlab(self, target_position: List[float], 
                                 target_orientation: Optional[List[float]] = None,
                                 initial_angles: Optional[List[float]] = None,
                                 max_iterations: int = 100, 
                                 tolerance: float = 1e-3) -> Tuple[List[float], bool, int, bool]:
        """
        حساب الحركة العكسية باستخدام MATLAB
        
        Args:
            target_position: الموقع المستهدف [x, y, z]
            target_orientation: الاتجاه المستهدف (اختياري)
            initial_angles: زوايا البداية (اختياري)
            max_iterations: العدد الأقصى للتكرارات
            tolerance: التفاوت المسموح
            
        Returns:
            joint_angles, success, iterations, out_of_bounds
        """
        if self.matlab_eng is None:
            # استخدام Python كـ fallback
            return self.python_kinematics.inverse_kinematics(
                target_position, target_orientation, initial_angles, max_iterations, tolerance
            )

        try:
            # تحويل الموقع المستهدف إلى تنسيق MATLAB
            matlab_pos = matlab.double(target_position)
            
            # استدعاء دالة MATLAB للحركة العكسية
            result = self.matlab_eng.panda_ik(self.robot_model, matlab_pos)
            
            # تحويل النتيجة من MATLAB إلى Python
            if result is not None:
                joint_angles = [float(angle) for angle in result[0]]
                
                # التحقق من حدود المفاصل
                out_of_bounds = False
                for i, angle in enumerate(joint_angles):
                    if angle < self.joint_limits[i][0] or angle > self.joint_limits[i][1]:
                        out_of_bounds = True
                        break
                
                # التحقق من دقة الحل
                T, computed_pos, _, _ = self.forward_kinematics_matlab(joint_angles)
                error = np.linalg.norm(np.array(target_position) - computed_pos)
                success = error < tolerance
                
                return joint_angles, success, 1, out_of_bounds
            else:
                # لم يتم العثور على حل
                return [0.0] * 7, False, max_iterations, True
                
        except Exception as e:
            logger.error(f"خطأ في MATLAB inverse kinematics: {e}")
            # استخدام Python كـ fallback
            if hasattr(self, 'python_kinematics'):
                return self.python_kinematics.inverse_kinematics(
                    target_position, target_orientation, initial_angles, max_iterations, tolerance
                )
            else:
                return [0.0] * 7, False, max_iterations, True

    def compute_jacobian_matlab(self, joint_angles: List[float]) -> np.ndarray:
        """
        حساب مصفوفة Jacobian باستخدام MATLAB
        
        Args:
            joint_angles: زوايا المفاصل السبعة
            
        Returns:
            مصفوفة Jacobian 6x7
        """
        if self.matlab_eng is None:
            # استخدام Python كـ fallback
            return self.python_kinematics.compute_jacobian(joint_angles)

        try:
            # تحويل زوايا المفاصل إلى تنسيق MATLAB
            matlab_angles = matlab.double(joint_angles)
            
            # استدعاء دالة MATLAB لحساب Jacobian
            # افتراض أن لديك دالة panda_jacobian في MATLAB
            J_matlab = self.matlab_eng.panda_jacobian(self.robot_model, matlab_angles)
            
            # تحويل النتيجة من MATLAB إلى NumPy
            jacobian = np.array(J_matlab)
            
            return jacobian
            
        except Exception as e:
            logger.error(f"خطأ في MATLAB Jacobian calculation: {e}")
            # استخدام Python كـ fallback
            if hasattr(self, 'python_kinematics'):
                return self.python_kinematics.compute_jacobian(joint_angles)
            else:
                raise e

    def check_singularity_matlab(self, joint_angles: List[float], threshold: float = 1e-6) -> Tuple[bool, float]:
        """
        التحقق من نقاط التفرد باستخدام MATLAB
        
        Args:
            joint_angles: زوايا المفاصل السبعة
            threshold: عتبة التفرد
            
        Returns:
            (is_singular, determinant)
        """
        try:
            J = self.compute_jacobian_matlab(joint_angles)
            
            # حساب محدد الجزء الخطي من Jacobian
            J_linear = J[:3, :]
            JJT = np.dot(J_linear, J_linear.T)
            det = np.linalg.det(JJT)
            
            is_singular = abs(det) < threshold
            
            return is_singular, float(det)
            
        except Exception as e:
            logger.error(f"خطأ في فحص التفرد: {e}")
            return False, 0.0

    def rotation_matrix_to_quaternion(self, R: np.ndarray) -> np.ndarray:
        """
        تحويل مصفوفة الدوران إلى quaternion [w, x, y, z]
        """
        tr = R.trace()
        if tr > 0:
            S = np.sqrt(tr + 1.0) * 2  # S = 4 * qw
            qw = 0.25 * S
            qx = (R[2, 1] - R[1, 2]) / S
            qy = (R[0, 2] - R[2, 0]) / S
            qz = (R[1, 0] - R[0, 1]) / S
        elif (R[0, 0] > R[1, 1]) and (R[0, 0] > R[2, 2]):
            S = np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
            qw = (R[2, 1] - R[1, 2]) / S
            qx = 0.25 * S
            qy = (R[0, 1] + R[1, 0]) / S
            qz = (R[0, 2] + R[2, 0]) / S
        elif R[1, 1] > R[2, 2]:
            S = np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
            qw = (R[0, 2] - R[2, 0]) / S
            qx = (R[0, 1] + R[1, 0]) / S
            qy = 0.25 * S
            qz = (R[1, 2] + R[2, 1]) / S
        else:
            S = np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
            qw = (R[1, 0] - R[0, 1]) / S
            qx = (R[0, 2] + R[2, 0]) / S
            qy = (R[1, 2] + R[2, 1]) / S
            qz = 0.25 * S

        return np.array([qw, qx, qy, qz])

    # Wrapper methods للتوافق مع الكود الحالي
    def forward_kinematics(self, joint_angles: List[float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
        return self.forward_kinematics_matlab(joint_angles)

    def inverse_kinematics(self, target_position, target_orientation=None, 
                          initial_angles=None, max_iterations=100, tolerance=1e-3):
        return self.inverse_kinematics_matlab(target_position, target_orientation, 
                                            initial_angles, max_iterations, tolerance)

    def compute_jacobian(self, joint_angles: List[float]) -> np.ndarray:
        return self.compute_jacobian_matlab(joint_angles)

    def check_singularity(self, joint_angles: List[float], threshold: float = 1e-6) -> Tuple[bool, float]:
        return self.check_singularity_matlab(joint_angles, threshold)