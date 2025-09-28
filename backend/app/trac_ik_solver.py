"""
Trac-IK Solver for Franka Panda Robot

This module provides an interface to the Trac-IK library for solving inverse kinematics
for the Franka Panda robot.
"""
import numpy as np
from typing import List, Optional, Tuple

class TracIKSolver:
    def __init__(self, urdf_path: str, base_link: str = "panda_link0", tip_link: str = "panda_hand"):
        """
        Initialize the Trac-IK solver for Franka Panda robot.
        
        Args:
            urdf_path: Path to the robot's URDF file
            base_link: Name of the base link (default: "panda_link0")
            tip_link: Name of the end-effector link (default: "panda_hand")
        """
        try:
            from trac_ik_python.trac_ik import IK
            self.ik_solver = IK(
                base_link,
                tip_link,
                urdf_filename=urdf_path,
                solve_type="Distance",  # Other options: "Speed", "Manipulation1", etc.
                eps=1e-5,              # Precision
                max_iters=1000         # Maximum iterations
            )
            self._load_joint_limits()
            self.initialized = True
            print("Successfully initialized Trac-IK solver")
        except ImportError as e:
            print(f"Failed to import Trac-IK: {e}")
            self.initialized = False
        except Exception as e:
            print(f"Error initializing Trac-IK: {e}")
            self.initialized = False
    
    def _load_joint_limits(self):
        """Load joint limits from the IK solver"""
        self.lower_limits = np.array(self.ik_solver.lower_limits)
        self.upper_limits = np.array(self.ik_solver.upper_limits)
        self.joint_ranges = self.upper_limits - self.lower_limits
    
    def solve(
        self, 
        target_position: List[float], 
        target_orientation: Optional[List[float]] = None, 
        initial_q: Optional[List[float]] = None
    ) -> Tuple[Optional[List[float]], bool]:
        """
        Solve IK for the given target position and orientation.
        
        Args:
            target_position: Target position [x, y, z] in meters
            target_orientation: Target orientation as quaternion [x, y, z, w]
            initial_q: Initial joint angles (optional)
            
        Returns:
            Tuple of (joint_angles, success)
        """
        if not self.initialized:
            return None, False
            
        if initial_q is None:
            # Use the middle of the joint ranges as initial guess
            initial_q = (self.lower_limits + self.upper_limits) / 2.0
            
        if target_orientation is None:
            # Default orientation: pointing forward
            target_orientation = [0.0, 1.0, 0.0, 0.0]
        
        try:
            # Solve IK
            joint_angles = self.ik_solver.get_ik(
                initial_q,
                target_position[0], target_position[1], target_position[2],
                target_orientation[0], target_orientation[1], 
                target_orientation[2], target_orientation[3]
            )
            
            if joint_angles is not None:
                # Clip to joint limits just to be safe
                joint_angles = np.clip(joint_angles, self.lower_limits, self.upper_limits)
                return joint_angles.tolist(), True
            return None, False
            
        except Exception as e:
            print(f"Error in Trac-IK solve: {e}")
            return None, False
    
    def is_initialized(self) -> bool:
        """Check if the solver was initialized successfully"""
        return self.initialized
