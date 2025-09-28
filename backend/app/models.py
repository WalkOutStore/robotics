# models.py - Fixed circular import issue
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class JointAngles(BaseModel):
    """نموذج لزوايا المفاصل السبعة للروبوت"""
    angles: List[float] = Field(..., min_items=7, max_items=7, description="زوايا المفاصل السبعة بالراديان")
    
    class Config:
        json_schema_extra = {
            "example": {
                "angles": [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785]
            }
        }

class EndEffectorPose(BaseModel):
    """نموذج لوضعية نهاية الذراع"""
    position: List[float] = Field(..., min_items=3, max_items=3, description="موقع نهاية الذراع (x, y, z)")
    orientation: List[float] = Field(..., min_items=4, max_items=4, description="اتجاه نهاية الذراع (quaternion: w, x, y, z)")
    transformation_matrix: List[List[float]] = Field(..., description="مصفوفة التحويل 4x4")
    out_of_bounds: bool = Field(False, description="هل زوايا المفاصل خارج الحدود المسموحة؟")
    
    class Config:
        json_schema_extra = {
            "example": {
                "position": [0.307, 0.0, 0.590],
                "orientation": [1.0, 0.0, 0.0, 0.0],
                "transformation_matrix": [
                    [1.0, 0.0, 0.0, 0.307],
                    [0.0, 1.0, 0.0, 0.0],
                    [0.0, 0.0, 1.0, 0.590],
                    [0.0, 0.0, 0.0, 1.0]
                ],
                "out_of_bounds": False
            }
        }

class TargetPose(BaseModel):
    """نموذج للوضعية المستهدفة"""
    position: List[float] = Field(..., min_items=3, max_items=3, description="الموقع المستهدف (x, y, z)")
    orientation: Optional[List[float]] = Field(None, min_items=4, max_items=4, description="الاتجاه المستهدف (quaternion: w, x, y, z)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "position": [0.4, 0.2, 0.5],
                "orientation": [1.0, 0.0, 0.0, 0.0]
            }
        }

class JacobianMatrix(BaseModel):
    """نموذج لمصفوفة جاكوبيان"""
    matrix: List[List[float]] = Field(..., description="مصفوفة جاكوبيان 6x7")
    determinant: float = Field(..., description="محدد مصفوفة جاكوبيان")
    
    class Config:
        json_schema_extra = {
            "example": {
                "matrix": [[0.0] * 7 for _ in range(6)],
                "determinant": 0.001
            }
        }

class SingularityCheck(BaseModel):
    """نموذج للتحقق من نقاط التفرد"""
    is_singular: bool = Field(..., description="هل الروبوت في نقطة تفرد؟")
    determinant: float = Field(..., description="محدد مصفوفة جاكوبيان")
    threshold: float = Field(default=1e-6, description="عتبة التفرد")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_singular": False,
                "determinant": 0.001,
                "threshold": 1e-6
            }
        }

class WorkspaceRequest(BaseModel):
    """نموذج لطلب حساب مساحة العمل"""
    num_samples: int = Field(default=10000, ge=1000, le=100000, description="عدد العينات لمحاكاة مونت كارلو")
    
    class Config:
        json_schema_extra = {
            "example": {
                "num_samples": 10000
            }
        }

class Bounds(BaseModel):
    """نموذج لحدود مساحة العمل"""
    x: List[float] = Field(..., min_items=2, max_items=2, description="الحد الأدنى والأقصى للمحور X")
    y: List[float] = Field(..., min_items=2, max_items=2, description="الحد الأدنى والأقصى للمحور Y")
    z: List[float] = Field(..., min_items=2, max_items=2, description="الحد الأدنى والأقصى للمحور Z")

class WorkspaceStats(BaseModel):
    """نموذج لإحصائيات مساحة العمل"""
    max_reach: float = Field(..., description="الحد الأقصى للوصول (متر)")
    volume: float = Field(..., description="حجم مساحة العمل (متر مكعب)")
    bounds: Bounds = Field(..., description="حدود مساحة العمل")
    point_count: int = Field(..., description="عدد النقاط في مساحة العمل")

class WorkspaceResponse(BaseModel):
    """نموذج لاستجابة مساحة العمل"""
    point_cloud: List[List[float]] = Field(..., description="سحابة النقاط ثلاثية الأبعاد")
    num_points: int = Field(..., description="عدد النقاط في السحابة")
    stats: WorkspaceStats = Field(..., description="إحصائيات مساحة العمل")
    
    class Config:
        json_schema_extra = {
            "example": {
                "point_cloud": [[0.3, 0.0, 0.6], [0.4, 0.1, 0.5]],
                "num_points": 2,
                "stats": {
                    "max_reach": 0.855,
                    "volume": 0.1,
                    "bounds": {
                        "x": [0.3, 0.4],
                        "y": [0.0, 0.1],
                        "z": [0.5, 0.6]
                    },
                    "point_count": 2
                }
            }
        }

class IKSolution(BaseModel):
    """نموذج لحل الحركة العكسية"""
    joint_angles: List[float] = Field(..., min_items=7, max_items=7, description="زوايا المفاصل المحسوبة")
    success: bool = Field(..., description="هل تم العثور على حل؟")
    error: Optional[str] = Field(None, description="رسالة خطأ في حالة فشل الحل")
    iterations: int = Field(..., description="عدد التكرارات المستخدمة")
    out_of_bounds: bool = Field(False, description="هل زوايا المفاصل المحسوبة خارج الحدود المسموحة؟")
    
    class Config:
        json_schema_extra = {
            "example": {
                "joint_angles": [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785],
                "success": True,
                "error": None,
                "iterations": 15,
                "out_of_bounds": False
            }
        }

class EventRequest(BaseModel):
    """نموذج لطلب الأحداث"""
    event: str = Field(..., description="نوع الحدث المرسل من الواجهة الأمامية")