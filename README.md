# Robot Control Interface for Franka Panda

A comprehensive web-based control interface for the Franka Panda 7-DOF robotic arm, featuring forward and inverse kinematics, workspace analysis, singularity detection, and achievement system.

## Features

### Core Functionality
- **Forward Kinematics**: Calculate end-effector pose from joint angles
- **Inverse Kinematics**: Compute joint angles for target positions
- **Jacobian Matrix**: Compute and analyze manipulator Jacobian
- **Singularity Detection**: Identify and handle kinematic singularities
- **Workspace Analysis**: Monte Carlo simulation of reachable workspace
- **MATLAB Integration**: Optional MATLAB Engine support for enhanced computations

### User Interface
- **3D Robot Visualization**: Interactive robot model display
- **Joint Control**: Real-time joint angle adjustment with sliders
- **Path Planning**: Trajectory planning and execution
- **Performance Monitoring**: Real-time stats and analytics
- **Voice Commands**: Speech-to-text robot control
- **Achievement System**: Gamified learning experience

### Advanced Features
- **Real-time Communication**: WebSocket-based updates
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Theme**: Customizable UI themes
- **Multi-language Support**: Arabic and English interfaces

## Technology Stack

### Backend
- **FastAPI**: High-performance async web framework
- **Python 3.8+**: Core programming language
- **NumPy**: Numerical computations
- **MATLAB Engine** (optional): Advanced robotics calculations
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: Modern JavaScript framework
- **Vite**: Fast build tool and dev server
- **Three.js**: 3D visualization
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable UI components

### Infrastructure
- **WebSocket**: Real-time communication
- **CORS**: Cross-origin resource sharing
- **RESTful API**: Standard HTTP endpoints

## Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- MATLAB (optional, for enhanced features)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. (Optional) Install MATLAB Engine:
```bash
# Install MATLAB Engine API for Python
# Follow MATLAB documentation for your version
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

### Running the Application

1. Start the backend server:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

2. Start the frontend (in a separate terminal):
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

- `GET /`: Root endpoint with API information
- `POST /kinematics/forward`: Forward kinematics calculation
- `POST /kinematics/inverse`: Inverse kinematics calculation
- `POST /kinematics/jacobian`: Jacobian matrix computation
- `POST /kinematics/singularity`: Singularity analysis
- `POST /workspace/calculate`: Workspace computation
- `GET /robot/info`: Robot specifications
- `GET /achievements`: Achievement system

## Project Structure

```
robot-control-interface/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Pydantic models
│   │   ├── kinematics.py    # Python kinematics implementation
│   │   ├── kinematics_matlab.py  # MATLAB integration
│   │   ├── workspace.py     # Workspace analysis
│   │   ├── achievements.py  # Achievement system
│   │   └── pybullet_ik.py   # PyBullet IK solver
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   └── services/         # API services
│   ├── package.json
│   └── vite.config.js
├── README.md
└── robot.bat                 # Windows batch script
```

## Configuration

### Environment Variables
- `MATLAB_ENGINE`: Enable/disable MATLAB integration
- `DEBUG`: Enable debug mode
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Robot Parameters
- **Degrees of Freedom**: 7
- **Joint Limits**: Configurable per joint
- **Max Reach**: Approximately 0.855m
- **Base Frame**: Standard Denavit-Hartenberg convention

## Usage

### Basic Operation

1. **Joint Control**: Use sliders to adjust individual joint angles
2. **Forward Kinematics**: Input joint angles to see end-effector pose
3. **Inverse Kinematics**: Specify target position for joint angle computation
4. **Workspace Analysis**: Generate and visualize reachable workspace
5. **Path Planning**: Create and execute joint trajectories

### Achievement System

The application includes a gamified achievement system to enhance learning:

- **Movement Master**: Perform joint movements
- **Home Return**: Return to home position
- **Workspace Explorer**: Calculate workspace
- **Singularity Hunter**: Encounter singularities
- **Path Planner**: Execute trajectories

### Voice Commands

Supported voice commands:
- "move joint [number] to [angle]"
- "go home"
- "calculate workspace"
- "show jacobian"

## Development

### Running Tests
```bash
cd backend
python -m pytest tests/
```

### Code Formatting
```bash
# Backend
black .
isort .

# Frontend
npm run format
```

### Building for Production

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. The backend can be deployed using:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Franka Emika GmbH for the Panda robot specifications
- MATLAB for robotics toolbox integration
- FastAPI community for excellent documentation
- React ecosystem for powerful frontend tools

## Support

For questions or issues:
- Check the API documentation at `/docs`
- Review the code comments
- Open an issue on GitHub

---

**Note**: This interface is designed for educational and research purposes. Always ensure proper safety measures when working with robotic systems.
