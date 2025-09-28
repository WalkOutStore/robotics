# main.py - Updated to properly map function outputs to models
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import List, Optional
import numpy as np
from pydantic import BaseModel
import logging
from .models import TrajectoryResponse, TrajectoryPoint
from .trajectory_generator import generate_b_trajectory

logger = logging.getLogger(__name__)
# إضافة نظام الإنجازات
from .achievements import achievement_manager, Achievement
from .models import (
    JointAngles, EndEffectorPose, TargetPose, JacobianMatrix,
    SingularityCheck, WorkspaceRequest, WorkspaceResponse, IKSolution,
    Bounds, WorkspaceStats
)
from .kinematics import FrankaPandaKinematicsMatlab
from .workspace import WorkspaceCalculator


# إنشاء تطبيق FastAPI
app = FastAPI(
    title="Franka Panda Robot Control API",
    description="واجهة برمجة تطبيقات للتحكم في روبوت Franka Panda 7-DOF",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# إعداد CORS للسماح بالوصول من الواجهة الأمامية
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تهيئة كائنات الحركة الروبوتية ومساحة العمل
kinematics = FrankaPandaKinematicsMatlab()
workspace_calculator = WorkspaceCalculator()

@app.get("/")
async def root():
    """الصفحة الرئيسية للواجهة الخلفية"""
    return {
        "message": "مرحباً بك في واجهة التحكم بروبوت Franka Panda",
        "version": "1.0.0",
        "endpoints": {
            "forward_kinematics": "/kinematics/forward",
            "inverse_kinematics": "/kinematics/inverse", 
            "jacobian": "/kinematics/jacobian",
            "singularity": "/kinematics/singularity",
            "workspace": "/workspace/calculate",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """فحص صحة الخدمة"""
    return {"status": "healthy", "service": "Franka Panda Control API"}

# 2. Add this new endpoint function to the file
@app.post("/trajectories/draw_b", response_model=TrajectoryResponse, tags=["Trajectories"])
async def draw_b_trajectory_endpoint():
    """
    Generates and solves the inverse kinematics for a trajectory
    that draws the letter 'B' in the robot's workspace.
    """
    try:
        # Call the generator function with the global kinematics object
        trajectory_list, total, successful = generate_b_trajectory(kinematics)

        # Convert the list of dictionaries to a list of TrajectoryPoint models
        trajectory_points = [TrajectoryPoint(**p) for p in trajectory_list]

        return TrajectoryResponse(
            trajectory=trajectory_points,
            total_points=total,
            successful_points=successful
        )
    except Exception as e:
        logger.error(f"Failed to generate 'B' trajectory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate trajectory: {str(e)}")


@app.post("/kinematics/forward", response_model=EndEffectorPose)
async def forward_kinematics_endpoint(joint_angles: JointAngles):
    """
    حساب الحركة الأمامية للروبوت
    
    Args:
        joint_angles: زوايا المفاصل السبعة
        
    Returns:
        وضعية نهاية الذراع (موقع، اتجاه، مصفوفة التحويل)
    """
    try:
        T_matrix, position, orientation, out_of_bounds = kinematics.forward_kinematics(joint_angles.angles)
        if out_of_bounds:
            achievement_manager.record_fk_out_of_bounds()
        
        return EndEffectorPose(
            position=position.tolist(),
            orientation=orientation.tolist(),
            transformation_matrix=T_matrix.tolist(),
            out_of_bounds=out_of_bounds
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في حساب الحركة الأمامية: {str(e)}")

@app.post("/kinematics/inverse", response_model=IKSolution)
async def inverse_kinematics_endpoint(target_pose: TargetPose):
    """
    حساب الحركة العكسية للروبوت
    
    Args:
        target_pose: الوضعية المستهدفة
        
    Returns:
        زوايا المفاصل المحسوبة
    """
    try:
        print(f"\n=== Received IK Request ===")
        print(f"Target position: {target_pose.position}")
        print(f"Target orientation: {target_pose.orientation}")
        
        # Ensure position is a numpy array of floats
        target_position = np.array(target_pose.position, dtype=float)
        print(f"Converted target position: {target_position}")
        
        # Call IK solver
        joint_angles, success, iterations, out_of_bounds = kinematics.inverse_kinematics(
            target_position=target_position,  # Pass as numpy array
            target_orientation=target_pose.orientation
        )
        
        print(f"IK Result - Success: {success}, Iterations: {iterations}, Out of bounds: {out_of_bounds}")
        print(f"Calculated joint angles: {np.around(joint_angles, 4)}")
        
        if out_of_bounds:
            achievement_manager.record_ik_out_of_bounds()
        
        error_message = None if success else "لم يتم العثور على حل للحركة العكسية"
        
        return IKSolution(
            joint_angles=joint_angles,
            success=success,
            error=error_message,
            iterations=iterations,
            out_of_bounds=out_of_bounds
        )
    except Exception as e:
        print(f"IK Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"خطأ في حساب الحركة العكسية: {str(e)}")

@app.post("/kinematics/jacobian", response_model=JacobianMatrix)
async def jacobian_endpoint(joint_angles: JointAngles):
    """
    حساب مصفوفة جاكوبيان للروبوت
    
    Args:
        joint_angles: زوايا المفاصل السبعة
        
    Returns:
        مصفوفة جاكوبيان ومحددها
    """
    try:
        J = kinematics.compute_jacobian(joint_angles.angles)
        
        # حساب محدد الجزء الخطي من جاكوبيان
        J_linear = J[:3, :]
        JJT = np.dot(J_linear, J_linear.T)
        det = float(np.linalg.det(JJT))
        
        return JacobianMatrix(
            matrix=J.tolist(),
            determinant=det
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في حساب مصفوفة جاكوبيان: {str(e)}")

@app.post("/kinematics/singularity", response_model=SingularityCheck)
async def singularity_endpoint(joint_angles: JointAngles):
    """
    التحقق من نقاط التفرد
    
    Args:
        joint_angles: زوايا المفاصل السبعة
        
    Returns:
        معلومات حول نقطة التفرد
    """
    try:
        is_singular, determinant = kinematics.check_singularity(joint_angles.angles)
        
        return SingularityCheck(
            is_singular=is_singular,
            determinant=float(determinant),
            threshold=1e-6
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في فحص نقاط التفرد: {str(e)}")

@app.post("/workspace/calculate", response_model=WorkspaceResponse)
async def workspace_endpoint(request: WorkspaceRequest):
    """
    حساب مساحة عمل الروبوت باستخدام محاكاة مونت كارلو
    """
    try:
        point_cloud, num_points = workspace_calculator.calculate_workspace(request.num_samples)
        
        # Calculate workspace statistics
        stats_dict = workspace_calculator.get_workspace_stats(point_cloud)
        
        # Convert to WorkspaceStats model
        stats = WorkspaceStats(
            max_reach=stats_dict["max_reach"],
            volume=stats_dict["volume"],
            bounds=Bounds(
                x=stats_dict["bounds"]["x"],
                y=stats_dict["bounds"]["y"],
                z=stats_dict["bounds"]["z"]
            ),
            point_count=stats_dict["point_count"]
        )
        
        return WorkspaceResponse(
            point_cloud=point_cloud,
            num_points=num_points,
            stats=stats
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في حساب مساحة العمل: {str(e)}")
    
@app.get("/workspace/bounds")
async def workspace_bounds_endpoint(num_samples: int = 10000):
    """
    حساب حدود مساحة العمل
    
    Args:
        num_samples: عدد العينات لحساب مساحة العمل
        
    Returns:
        حدود مساحة العمل في كل محور
    """
    try:
        point_cloud, _ = workspace_calculator.calculate_workspace(num_samples)
        bounds = workspace_calculator.calculate_workspace_bounds(point_cloud)
        
        return {
            "bounds": bounds,
            "num_samples": num_samples,
            "num_points": len(point_cloud)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في حساب حدود مساحة العمل: {str(e)}")

@app.get("/robot/info")
async def robot_info():
    """
    معلومات عن الروبوت
    
    Returns:
        معلومات أساسية عن روبوت Franka Panda
    """
    return {
        "name": "Franka Panda",
        "dof": 7,
        "joint_limits": kinematics.joint_limits.tolist(),
        "dh_parameters": kinematics.dh_params.tolist(),
        "max_reach": kinematics.max_reach,
        "description": "روبوت صناعي بـ 7 درجات حرية من شركة Franka Emika"
    }

@app.get("/robot/home_position")
async def home_position():
    """
    الوضعية المنزلية للروبوت
    
    Returns:
        زوايا المفاصل للوضعية المنزلية
    """
    home_angles = [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785]
    
    try:
        T_matrix, position, orientation, _ = kinematics.forward_kinematics(home_angles)
        
        return {
            "joint_angles": home_angles,
            "end_effector_pose": {
                "position": position.tolist(),
                "orientation": orientation.tolist()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في حساب الوضعية المنزلية: {str(e)}")
    
@app.get("/achievements", response_model=List[Achievement])
async def get_achievements():
    """
    الحصول على جميع الإنجازات
    
    Returns:
        قائمة بجميع الإنجازات المتاحة
    """
    try:
        return achievement_manager.get_all_achievements()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الإنجازات: {str(e)}")

@app.get("/achievements/unlocked", response_model=List[Achievement])
async def get_unlocked_achievements():
    """
    الحصول على الإنجازات المفتوحة فقط
    
    Returns:
        قائمة بالإنجازات المفتوحة
    """
    try:
        return achievement_manager.get_unlocked_achievements()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الإنجازات المفتوحة: {str(e)}")

@app.get("/achievements/progress")
async def get_progress():
    """
    الحصول على ملخص التقدم
    
    Returns:
        ملخص شامل للتقدم والإحصائيات
    """
    try:
        return achievement_manager.get_progress_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في جلب ملخص التقدم: {str(e)}")

@app.post("/achievements/record/movement")
async def record_movement():
    """
    تسجيل حركة مفصل
    
    Returns:
        الإنجازات الجديدة المفتوحة (إن وجدت)
    """
    try:
        newly_unlocked = achievement_manager.record_movement()
        return {"newly_unlocked": newly_unlocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل الحركة: {str(e)}")

@app.post("/achievements/record/home_return")
async def record_home_return():
    """
    تسجيل العودة للوضعية المنزلية
    
    Returns:
        الإنجازات الجديدة المفتوحة (إن وجدت)
    """
    try:
        newly_unlocked = achievement_manager.record_home_return()
        return {"newly_unlocked": newly_unlocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل العودة للمنزل: {str(e)}")

@app.post("/achievements/record/workspace")
async def record_workspace_calculation():
    """
    تسجيل حساب مساحة العمل
    
    Returns:
        الإنجازات الجديدة المفتوحة (إن وجدت)
    """
    try:
        newly_unlocked = achievement_manager.record_workspace_calculation()
        return {"newly_unlocked": newly_unlocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل حساب مساحة العمل: {str(e)}")

@app.post("/achievements/record/singularity")
async def record_singularity():
    """
    تسجيل مواجهة نقطة تفرد
    
    Returns:
        الإنجازات الجديدة المفتوحة (إن وجدت)
    """
    try:
        newly_unlocked = achievement_manager.record_singularity_encounter()
        return {"newly_unlocked": newly_unlocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل نقطة التفرد: {str(e)}")

@app.post("/achievements/record/path")
async def record_path_execution():
    """
    تسجيل تنفيذ مسار
    
    Returns:
        الإنجازات الجديدة المفتوحة (إن وجدت)
    """
    try:
        newly_unlocked = achievement_manager.record_path_execution()
        return {"newly_unlocked": newly_unlocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل تنفيذ المسار: {str(e)}")

# ---------- نموذج الإدخال للأحداث (يمكن نقله لـ models.py لاحقًا) ----------
class EventRequest(BaseModel):
    event: str

# ---------- نظام الأحداث العام (يتوافق مع recordEvent) ----------
@app.post("/achievements/event")
def achievements_event(req: EventRequest):
    """
    تسجيل حدث عام من الواجهة الأمامية (يتوافق مع recordEvent)
    """
    event = req.event
    newly_unlocked = []

    try:
        if event == "connected":
            pass  # لا إنجاز مباشر عند الاتصال
        elif event == "movement":
            newly_unlocked = achievement_manager.record_movement()
        elif event == "home_return":
            newly_unlocked = achievement_manager.record_home_return()
        elif event == "workspace_calculation":
            newly_unlocked = achievement_manager.record_workspace_calculation()
        elif event == "path_execution":
            newly_unlocked = achievement_manager.record_path_execution()
        elif event == "singularity_encounter":
            newly_unlocked = achievement_manager.record_singularity_encounter()
        elif event == "path_import":
            newly_unlocked = achievement_manager.record_path_import()
        elif event == "path_export":
            newly_unlocked = achievement_manager.record_path_export()
        elif event == "fk_out_of_bounds":
            newly_unlocked = achievement_manager.record_fk_out_of_bounds()
        elif event == "ik_out_of_bounds":
            newly_unlocked = achievement_manager.record_ik_out_of_bounds()
        else:
            return {"new_achievements": []}

        return {"new_achievements": [a.dict() for a in newly_unlocked]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in event handling: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
