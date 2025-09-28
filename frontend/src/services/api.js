import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
export const robotAPI = {
  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // Robot information
  async getRobotInfo() {
    try {
      const response = await api.get('/robot/info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get robot info: ${error.message}`);
    }
  },

  // Home position
  async getHomePosition() {
    try {
      const response = await api.get('/robot/home_position');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get home position: ${error.message}`);
    }
  },

  // Forward kinematics - محسن
  async forwardKinematics(jointAngles) {
    try {
      const response = await api.post('/kinematics/forward', {
        angles: jointAngles
      });
      
      // التحقق من صحة البيانات المرجعة
      const data = response.data;
      if (!data.position || !Array.isArray(data.position)) {
        throw new Error('Invalid response format: position missing or invalid');
      }
      
      return {
        out_of_bounds: data.out_of_bounds || false,
        position: data.position,
        orientation: data.orientation || null,
        transformation_matrix: data.transformation_matrix || null,
        success: true
      };
    } catch (error) {
      console.error('Forward kinematics error:', error);
      if (error.response?.data) {
        throw new Error(`Forward kinematics failed: ${error.response.data.detail || error.message}`);
      }
      throw new Error(`Forward kinematics failed: ${error.message}`);
    }
  },

  // Inverse kinematics - محسن
  async inverseKinematics(targetPosition, targetOrientation = null) {
    try {
      const payload = {
        position: targetPosition
      };
      if (targetOrientation) {
        payload.orientation = targetOrientation;
      }
      
      const response = await api.post('/kinematics/inverse', payload);
      const data = response.data;
      
      return {
        out_of_bounds: data.out_of_bounds || false,
        joint_angles: Array.isArray(data.joint_angles) ? data.joint_angles : [],
        success: Boolean(data.success),
        error: data.error || null
      };
    } catch (error) {
      console.error('Inverse kinematics error:', error);
      if (error.response?.data) {
        return {
          out_of_bounds: false,
          joint_angles: [],
          success: false,
          error: error.response.data.detail || error.message
        };
      }
      return {
        out_of_bounds: false,
        joint_angles: [],
        success: false,
        error: error.message
      };
    }
  },

  // Jacobian matrix
  async getJacobian(jointAngles) {
    try {
      const response = await api.post('/kinematics/jacobian', {
        angles: jointAngles
      });
      return response.data;
    } catch (error) {
      throw new Error(`Jacobian calculation failed: ${error.message}`);
    }
  },

  // Singularity check
  async checkSingularity(jointAngles) {
    try {
      const response = await api.post('/kinematics/singularity', {
        angles: jointAngles
      });
      return response.data;
    } catch (error) {
      throw new Error(`Singularity check failed: ${error.message}`);
    }
  },

  // Workspace calculation
  async calculateWorkspace(numSamples = 10000) {
    try {
      const response = await api.post('/workspace/calculate', {
        num_samples: numSamples
      }, {
        timeout: 60000 
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('Server responded with:', error.response.data);
        console.error('Status code:', error.response.status);
      }
      throw new Error(`Workspace calculation failed: ${error.message}`);
    }
  },

  // Workspace bounds
  async getWorkspaceBounds(numSamples = 10000) {
    try {
      const response = await api.get(`/workspace/bounds?num_samples=${numSamples}`);
      return response.data;
    } catch (error) {
      throw new Error(`Workspace bounds calculation failed: ${error.message}`);
    }
  }
};

// Connection status checker - محسن
export const checkConnection = async () => {
  try {
    const response = await robotAPI.healthCheck();
    return response.status === 'healthy';
  } catch (error) {
    console.warn('Connection check failed:', error.message);
    return false;
  }
};

// Achievement functions
export const getUnlockedAchievements = async () => {
  try {
    const res = await api.get("/achievements/unlocked");
    return res.data;
  } catch (e) {
    console.error("Failed to fetch unlocked achievements:", e);
    return [];
  }
};

export const getAchievementsProgress = async () => {
  try {
    const res = await api.get("/achievements/progress");
    return res.data;
  } catch (e) {
    console.error("Failed to fetch achievements progress:", e);
    return { stats: {}, achievements: [] };
  }
};

export const recordEvent = async (eventType, payload = {}) => {
  try {
    const res = await api.post('/achievements/event', { 
      event: eventType,
      ...payload 
    });
    return res.data.new_achievements || [];
  } catch (e) {
    console.warn('Achievement event failed:', e);
    return [];
  }
};

// Default joint limits for Franka Panda (in radians)
export const JOINT_LIMITS = [
  [-2.8973, 2.8973],   // Joint 1
  [-1.7628, 1.7628],   // Joint 2
  [-2.8973, 2.8973],   // Joint 3
  [-3.0718, -0.0698],  // Joint 4
  [-2.8973, 2.8973],   // Joint 5
  [-0.0175, 3.7525],   // Joint 6
  [-2.8973, 2.8973]    // Joint 7
];

// Default home position
export const HOME_POSITION = [0.0, -0.785, 0.0, -2.356, 0.0, 1.571, 0.785];

// Joint names in Arabic
export const JOINT_NAMES = [
  'المفصل الأول',
  'المفصل الثاني', 
  'المفصل الثالث',
  'المفصل الرابع',
  'المفصل الخامس',
  'المفصل السادس',
  'المفصل السابع'
];

// Export main functions
export const forwardKinematics = robotAPI.forwardKinematics;
export const inverseKinematics = robotAPI.inverseKinematics;
export const calculateWorkspace = robotAPI.calculateWorkspace;

export default api;