"""
Pure Python implementation of Franka Panda kinematics
This provides a fallback when MATLAB engine is not available
"""
import numpy as np
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class FrankaPandaKinematicsPython:
    """Pure Python implementation of Franka Panda kinematics"""

    def __init__(self):
        """Initialize Python kinematics calculator"""
        # DH parameters for Franka Panda robot
        self.dh_params = np.array([
    [0.0, 0.0, 0.333, 0.0],          # Joint 1
    [0.0, -np.pi/2, 0.0, 0.0],       # Joint 2
    [0.0, np.pi/2, 0.316, 0.0],      # Joint 3
    [0.0825, np.pi/2, 0.0, 0.0],     # Joint 4
    [-0.0825, -np.pi/2, 0.384, 0.0], # Joint 5
    [0.0, np.pi/2, 0.0, 0.0],        # Joint 6
    [0.088, np.pi/2, 0.107, 0.0]     # Joint 7 (d=0.107)
])

        # Official joint limits from Franka Panda datasheet (in radians)
        self.joint_limits = np.array([
            [-2.8973, 2.8973],    
            [-1.7628, 1.7628],    
            [-2.8973, 2.8973],    
            [-3.0718, -0.0698],   
            [-2.8973, 2.8973],    
            [-0.0175, 3.7525],    
            [-2.8973, 2.8973]     
        ])

        # Maximum reach from base (855 mm)
        self.max_reach = 0.855

    def dh_transform(self, a, alpha, d, theta):
        """Calculate DH transformation matrix"""
        ct = np.cos(theta)
        st = np.sin(theta)
        ca = np.cos(alpha)
        sa = np.sin(alpha)

        T = np.array([
        [ct, -st, 0, a],
        [st * ca, ct * ca, -sa, -d * sa],
        [st * sa, ct * sa, ca, d * ca],
        [0, 0, 0, 1]
    ])
        return T

    def forward_kinematics(self, joint_angles: List[float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
        """
        Calculate forward kinematics using DH parameters

        Args:
            joint_angles: 7 joint angles in radians

        Returns:
            T_total (4x4), position (3,), orientation quaternion [w,x,y,z], out_of_bounds (bool)
        """
        if len(joint_angles) != 7:
            raise ValueError("Expected 7 joint angles")

        # Check joint limits
        out_of_bounds = False
        for i, angle in enumerate(joint_angles):
            if angle < self.joint_limits[i][0] or angle > self.joint_limits[i][1]:
                out_of_bounds = True
                break

        try:
            # Calculate forward kinematics using DH parameters
            T_total = np.eye(4)

            for i, (a, alpha, d, theta_offset) in enumerate(self.dh_params):
                theta = joint_angles[i] + theta_offset
                T = self.dh_transform(a, alpha, d, theta)
                T_total = T_total @ T

            # Extract position and orientation
            position = T_total[:3, 3].copy()
            rotation_matrix = T_total[:3, :3].copy()
            orientation = self.rotation_matrix_to_quaternion(rotation_matrix)

            return T_total, position, orientation, out_of_bounds

        except Exception as e:
            logger.error(f"Error in Python forward kinematics: {e}")
            raise e

    def rotation_matrix_to_quaternion(self, R: np.ndarray) -> np.ndarray:
        """Convert rotation matrix to quaternion [w, x, y, z]"""
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

    def compute_jacobian(self, joint_angles: List[float]) -> np.ndarray:
        """
        Compute numerical Jacobian matrix

        Args:
            joint_angles: 7 joint angles in radians

        Returns:
            6x7 Jacobian matrix
        """
        if len(joint_angles) != 7:
            raise ValueError("Expected 7 joint angles")

        epsilon = 1e-6
        jacobian = np.zeros((6, 7))

        # Current end-effector pose
        T_current, pos_current, ori_current, _ = self.forward_kinematics(joint_angles)

        for i in range(7):
            # Perturb joint i
            joint_angles_pert = joint_angles.copy()
            joint_angles_pert[i] += epsilon

            try:
                T_pert, pos_pert, ori_pert, _ = self.forward_kinematics(joint_angles_pert)

                # Linear velocity part (position change)
                delta_pos = (pos_pert - pos_current) / epsilon
                jacobian[:3, i] = delta_pos

                # Angular velocity part (orientation change)
                # Convert quaternions to rotation matrices and compute difference
                R_current = T_current[:3, :3]
                R_pert = T_pert[:3, :3]

                # Compute skew symmetric matrix difference
                delta_R = R_pert - R_current
                delta_omega = (delta_R / epsilon) @ R_current.T

                # Extract angular velocity vector
                delta_omega_vec = np.array([
                    delta_omega[2, 1],
                    delta_omega[0, 2],
                    delta_omega[1, 0]
                ]) / 2.0

                jacobian[3:, i] = delta_omega_vec

            except Exception as e:
                logger.warning(f"Error computing Jacobian column {i}: {e}")
                # Keep zeros for this column
                pass

        return jacobian

    def check_singularity(self, joint_angles: List[float], threshold: float = 1e-6) -> Tuple[bool, float]:
        """
        Check for singularities using Jacobian determinant

        Args:
            joint_angles: 7 joint angles in radians
            threshold: Singularity threshold

        Returns:
            (is_singular, determinant)
        """
        try:
            J = self.compute_jacobian(joint_angles)

            # Compute determinant of linear part of Jacobian
            J_linear = J[:3, :]
            JJT = np.dot(J_linear, J_linear.T)
            det = np.linalg.det(JJT)

            is_singular = abs(det) < threshold

            return is_singular, float(det)

        except Exception as e:
            logger.error(f"Error checking singularity: {e}")
            return False, 0.0

    def inverse_kinematics(self, target_position, target_orientation=None,
                          initial_angles=None, max_iterations=100, tolerance=1e-3):
        """
        Simple numerical inverse kinematics solver

        Args:
            target_position: Target position [x, y, z]
            target_orientation: Target orientation (not implemented in basic version)
            initial_angles: Initial joint angles guess
            max_iterations: Maximum iterations
            tolerance: Position tolerance

        Returns:
            joint_angles, success, iterations, out_of_bounds
        """
        if initial_angles is None:
            # Use home position as initial guess
            initial_angles = [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785]

        current_angles = np.array(initial_angles, dtype=float)
        target_pos = np.array(target_position, dtype=float)

        for iteration in range(max_iterations):
            # Current pose
            T, current_pos, _, _ = self.forward_kinematics(current_angles.tolist())

            # Position error
            pos_error = target_pos - current_pos
            error_norm = np.linalg.norm(pos_error)

            if error_norm < tolerance:
                # Check joint limits
                out_of_bounds = False
                for i, angle in enumerate(current_angles):
                    if angle < self.joint_limits[i][0] or angle > self.joint_limits[i][1]:
                        out_of_bounds = True
                        break

                return current_angles.tolist(), True, iteration + 1, out_of_bounds

            if iteration == max_iterations - 1:
                break

            # Compute Jacobian
            J = self.compute_jacobian(current_angles.tolist())

            # Use linear part of Jacobian for position control
            J_pos = J[:3, :]

            try:
                # Solve for joint angle updates
                delta_angles = np.linalg.pinv(J_pos) @ pos_error
                current_angles += delta_angles

                # Clip to joint limits
                for i in range(len(current_angles)):
                    current_angles[i] = np.clip(current_angles[i],
                                              self.joint_limits[i][0],
                                              self.joint_limits[i][1])

            except np.linalg.LinAlgError:
                # Singular or ill-conditioned Jacobian
                break

        
        out_of_bounds = False
        for i, angle in enumerate(current_angles):
            if angle < self.joint_limits[i][0] or angle > self.joint_limits[i][1]:
                out_of_bounds = True
                break

        return current_angles.tolist(), False, max_iterations, out_of_bounds
