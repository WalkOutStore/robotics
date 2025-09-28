# File: trajectory_generator.py

import numpy as np
from typing import List, Tuple, Dict
from .kinematics import FrankaPandaKinematicsMatlab
import logging

logger = logging.getLogger(__name__)

def generate_b_trajectory(
    kinematics: FrankaPandaKinematicsMatlab,
    scale: float = 0.25,
    center: List[float] = [0.5, 0.0, 0.4],
    points_per_segment: int = 40
) -> Tuple[List[Dict], int, int]:
    """
    Generates a dense trajectory for the letter 'B' and solves IK for each point.

    Args:
        kinematics: The kinematics solver instance.
        scale: The overall size of the letter.
        center: The center point (x, y, z) for the letter.
        points_per_segment: Number of points for the line and each arc.

    Returns:
        A tuple containing the trajectory data, total points, and successful points.
    """
    logger.info(f"Generating trajectory for letter 'B' with scale={scale} at center={center}")

    # 1. Define the main waypoints for the letter 'B'
    # The letter will be drawn on the YZ plane (vertical)
    center_point = np.array(center)
    p_bottom = center_point + np.array([0, 0, -scale / 2])
    p_top = center_point + np.array([0, 0, scale / 2])
    p_middle = np.copy(center_point)

    # 2. Generate dense points for each segment using interpolation
    # Vertical Line (from top to bottom)
    line_points = np.linspace(p_top, p_bottom, points_per_segment)

    # Bottom Arc (from bottom to middle)
    theta = np.linspace(-np.pi / 2, np.pi / 2, points_per_segment)
    bottom_arc_center = (p_bottom + p_middle) / 2
    bottom_arc_radius = scale / 4
    bottom_arc_points_y = bottom_arc_center[1] + bottom_arc_radius * np.cos(theta)
    bottom_arc_points_z = bottom_arc_center[2] + bottom_arc_radius * np.sin(theta)

    # Top Arc (from middle to top)
    top_arc_center = (p_middle + p_top) / 2
    top_arc_radius = scale / 4
    top_arc_points_y = top_arc_center[1] + top_arc_radius * np.cos(theta)
    top_arc_points_z = top_arc_center[2] + top_arc_radius * np.sin(theta)

    # Combine all points into a single path
    full_path_3d = []
    full_path_3d.extend(line_points.tolist())
    for i in range(points_per_segment):
        full_path_3d.append([center[0], bottom_arc_points_y[i], bottom_arc_points_z[i]])
    for i in range(points_per_segment):
        full_path_3d.append([center[0], top_arc_points_y[i], top_arc_points_z[i]])
    
    full_path = np.array(full_path_3d)

    # 3. Solve Inverse Kinematics for every point in the path
    trajectory_data = []
    successful_points = 0
    # Use home position as the initial guess for the first point
    last_successful_angles = [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785]

    for i, point in enumerate(full_path):
        angles, success, _, _ = kinematics.inverse_kinematics(
            target_position=point.tolist(),
            initial_angles=last_successful_angles,
            tolerance=1e-3,
            max_iterations=50 # Use fewer iterations for speed
        )
        
        if success:
            last_successful_angles = angles  # Use the last good solution as a guess for the next point
            successful_points += 1
        
        trajectory_data.append({
            "joint_angles": angles,
            "position": point.tolist(),
            "success": success
        })

    logger.info(f"Trajectory generation complete. Solved {successful_points}/{len(full_path)} points successfully.")
    return trajectory_data, len(full_path), successful_points