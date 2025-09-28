import unittest
import numpy as np
import sys
import os

# إضافة مسار الواجهة الخلفية للاستيراد
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.kinematics import FrankaPandaKinematics
from app.workspace import WorkspaceCalculator

class TestFrankaPandaKinematics(unittest.TestCase):
    """اختبارات وحدة الحركة الروبوتية"""
    
    def setUp(self):
        """إعداد الاختبارات"""
        self.kinematics = FrankaPandaKinematics()
        self.home_position = [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785]
    
    def test_forward_kinematics_home_position(self):
        """اختبار الحركة الأمامية للوضعية المنزلية"""
        T_matrix, position, orientation, out_of_bounds = self.kinematics.forward_kinematics(self.home_position)
        
        # التحقق من أن المصفوفة 4x4
        self.assertEqual(T_matrix.shape, (4, 4))
        
        # التحقق من أن الموقع ثلاثي الأبعاد
        self.assertEqual(len(position), 3)
        
        # التحقق من أن الاتجاه quaternion (4 عناصر)
        self.assertEqual(len(orientation), 4)
        
        # التحقق من أن الموقع منطقي (ضمن نطاق معقول)
        self.assertTrue(0.0 <= position[0] <= 1.0)  # x
        self.assertTrue(0.0 <= position[1] <= 1.0)  # y
        self.assertTrue(0.1 <= position[2] <= 1.0)   # z
    
    def test_jacobian_computation(self):
        """اختبار حساب مصفوفة جاكوبيان"""
        J = self.kinematics.compute_jacobian(self.home_position)
        
        # التحقق من أن مصفوفة جاكوبيان 6x7
        self.assertEqual(J.shape, (6, 7))
        
        # التحقق من أن المصفوفة لا تحتوي على قيم NaN أو Inf
        self.assertTrue(np.all(np.isfinite(J)))
    
    def test_singularity_check(self):
        """اختبار فحص نقاط التفرد"""
        is_singular, determinant = self.kinematics.check_singularity(self.home_position)
        
        # التحقق من أن النتيجة منطقية
        self.assertIsInstance(is_singular, bool)
        self.assertIsInstance(determinant, (float, np.floating))
        
        # التحقق من أن المحدد رقم صالح
        self.assertTrue(np.isfinite(determinant))
    
    def test_inverse_kinematics(self):
        """اختبار الحركة العكسية"""
        # حساب الموقع المستهدف من الوضعية المنزلية
        _, target_position, target_orientation, _ = self.kinematics.forward_kinematics(self.home_position)
        
        # حساب الحركة العكسية
        joint_angles, success, iterations, out_of_bounds = self.kinematics.inverse_kinematics(
            target_position.tolist(),
            target_orientation.tolist()
        )
        
        # التحقق من النتائج
        self.assertIsInstance(success, bool)
        self.assertIsInstance(iterations, int)
        self.assertEqual(len(joint_angles), 7)
        
        # إذا نجح الحل، التحقق من دقته
        if success:
            _, computed_position, _, _ = self.kinematics.forward_kinematics(joint_angles)
            position_error = np.linalg.norm(computed_position - target_position)
            self.assertLess(position_error, 0.01)  # خطأ أقل من 1 سم
    
    def test_joint_limits_validation(self):
        """اختبار التحقق من حدود المفاصل"""
        # اختبار زوايا ضمن الحدود
        valid_angles = [0.0, 0.0, 0.0, -1.5, 0.0, 1.5, 0.0]
        try:
            T_matrix, position, orientation, out_of_bounds = self.kinematics.forward_kinematics(valid_angles)
            # يجب أن ينجح بدون أخطاء
            self.assertEqual(T_matrix.shape, (4, 4))
        except Exception as e:
            self.fail(f"فشل في حساب الحركة الأمامية للزوايا الصالحة: {e}")
    
    def test_transformation_matrix_properties(self):
        """اختبار خصائص مصفوفة التحويل"""
        T_matrix, _, _, _ = self.kinematics.forward_kinematics(self.home_position)
        
        # التحقق من أن الصف الأخير [0, 0, 0, 1]
        expected_last_row = np.array([0, 0, 0, 1])
        np.testing.assert_array_almost_equal(T_matrix[3, :], expected_last_row)
        
        # التحقق من أن مصفوفة الدوران orthogonal
        R = T_matrix[:3, :3]
        should_be_identity = np.dot(R, R.T)
        np.testing.assert_array_almost_equal(should_be_identity, np.eye(3), decimal=5)

class TestWorkspaceCalculator(unittest.TestCase):
    """اختبارات حاسبة مساحة العمل"""
    
    def setUp(self):
        """إعداد الاختبارات"""
        self.workspace_calc = WorkspaceCalculator()
    
    def test_random_joint_angles_generation(self):
        """اختبار توليد زوايا المفاصل العشوائية"""
        angles = self.workspace_calc.generate_random_joint_angles()
        
        # التحقق من عدد الزوايا
        self.assertEqual(len(angles), 7)
        
        # التحقق من أن الزوايا ضمن الحدود المسموحة
        for i, angle in enumerate(angles):
            min_limit = self.workspace_calc.kinematics.joint_limits[i][0]
            max_limit = self.workspace_calc.kinematics.joint_limits[i][1]
            self.assertTrue(min_limit <= angle <= max_limit)
    
    def test_workspace_calculation(self):
        """اختبار حساب مساحة العمل"""
        # استخدام عدد قليل من العينات للاختبار السريع
        point_cloud, num_points = self.workspace_calc.calculate_workspace(1000)
        
        # التحقق من النتائج
        self.assertIsInstance(point_cloud, list)
        self.assertIsInstance(num_points, int)
        self.assertGreater(num_points, 0)
        self.assertEqual(len(point_cloud), num_points)
        
        # التحقق من أن كل نقطة ثلاثية الأبعاد
        for point in point_cloud[:10]:  # فحص أول 10 نقاط فقط
            self.assertEqual(len(point), 3)
            self.assertTrue(all(isinstance(coord, (float, int)) for coord in point))
    
    def test_workspace_bounds_calculation(self):
        """اختبار حساب حدود مساحة العمل"""
        # إنشاء سحابة نقاط تجريبية
        test_points = [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
            [0.7, 0.8, 0.9]
        ]
        
        bounds = self.workspace_calc.calculate_workspace_bounds(test_points)
        
        # التحقق من البنية
        self.assertIn("x", bounds)
        self.assertIn("y", bounds)
        self.assertIn("z", bounds)
        
        # التحقق من القيم
        self.assertEqual(bounds["x"], [0.1, 0.7])
        self.assertEqual(bounds["y"], [0.2, 0.8])
        self.assertEqual(bounds["z"], [0.3, 0.9])

if __name__ == '__main__':
    # تشغيل الاختبارات
    unittest.main(verbosity=2)
