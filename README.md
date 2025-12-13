# Founders House 3D Viewer

> An immersive WebGL-based 3D visualization featuring a cinematic intro animation, dynamic lighting effects, and interactive exploration of a detailed city model.

Built with React, TypeScript, and Three.js, this project showcases advanced rendering techniques including custom GLSL shaders, post-processing effects, and smooth camera animations.

---

## ✨ Features

### Core Visualization
- **Interactive 3D City Model** - High-detail GLB model with DRACO compression
- **Cinematic Intro Animation** - Smooth 5-second camera sweep with cubic-bezier easing
- **Idle Orbital Rotation** - Gentle perpetual rotation around a focal point after intro
- **Custom Pencil Shader** - Real-time GLSL shader for artistic sketch effect
- **Post-Processing Pipeline** - Edge detection and organic noise textures

### Visual Effects
- **Loading Animations** - Smooth logo fade-in and typing text sequences
- **Dynamic Day/Night Mode** - Automatic switching based on Helsinki time
- **Procedural City Lights** - 800+ instanced lights with flickering animation (night mode)
- **Volumetric Fog** - Depth-based fog with smooth transitions
- **Enhanced Starfield** - Multi-layered procedural stars with Milky Way and nebula clusters (night mode)
- **Smooth Animations** - Clean slide transitions between loading states

### Interaction
- **Advanced Camera Controls** - OrbitControls with optional camera-controls upgrade
- **User Interruption Detection** - Smooth transition from animation to manual control
- **Responsive Design** - Adapts to all screen sizes
- **Loading Progress** - Real-time feedback during model loading

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Modern browser with WebGL 2 support

### Installation

```bash
# Clone the repository
git clone https://github.com/abdirizaqali01/foundershouse1.git
cd foundershouse

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🏗️ Architecture

### Project Structure

```
foundershouse/
├── src/
│   ├── animation/          # Camera animation system
│   │   ├── cinematicAnimation.ts   # Intro cinematic logic
│   │   ├── idleRotation.ts         # Perpetual orbital rotation
│   │   └── index.ts
│   ├── components/         # React UI components
│   │   ├── HelsinkiViewer.tsx      # Main 3D viewer component
│   │   ├── HelsinkiViewer.css      # Styled UI overlay
│   │   ├── LoadingScreen.tsx       # Initial logo loading screen
│   │   ├── LoadingScreen.css       # Loading screen styles
│   │   ├── TypingAnimation.tsx     # Animated typing text component
│   │   └── TypingAnimation.css     # Typing animation styles
│   ├── constants/          # Design system & configuration
│   │   └── designSystem.ts         # Colors, fog, animation params
│   ├── core/              # Core 3D scene management
│   │   ├── HelsinkiScene_GLB.ts    # Main scene orchestrator
│   │   └── HelsinkiCameraController.ts  # Camera wrapper
│   ├── effects/           # Visual effects systems
│   │   ├── cityLights_refactored.ts # Optimized city lights system
│   │   ├── fogManager.ts           # Fog control utilities
│   │   ├── stars.ts                # Enhanced starfield with Milky Way
│   │   └── shaders/                # Effect-specific shaders
│   │       └── cityLightShaders.ts # City light GLSL shaders
│   ├── helpers/           # Utility functions
│   │   ├── geometryHelpers.ts      # Mesh traversal & analysis
│   │   ├── perlinNoise.ts          # Procedural noise generator
│   │   └── timeUtils.ts            # Day/night detection
│   ├── loaders/           # 3D model loading
│   │   └── modelLoader.ts          # GLB loader with DRACO
│   ├── rendering/         # Rendering pipeline
│   │   ├── lighting.ts             # Scene lighting setup
│   │   └── postProcessing.ts       # Shader post-processing
│   ├── shaders/           # GLSL shader programs
│   │   ├── pencilFragment.glsl     # Pencil effect fragment shader
│   │   ├── pencilVertex.glsl       # Vertex shader
│   │   ├── postProcessFragment.glsl # Post-process fragment
│   │   └── postProcessVertex.glsl  # Post-process vertex
│   ├── types/             # TypeScript type definitions
│   │   └── camera-controls.d.ts
│   ├── App.tsx            # Root React component
│   ├── main.tsx           # Application entry point
│   └── README.md          # Detailed technical guide
├── public/                # Static assets
│   ├── untitled1.glb      # City 3D model (28MB)
│   └── FHLOGO.png         # Logo asset
├── index.html
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript config
└── package.json
```

### Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 19.0.0 |
| **TypeScript** | Type safety | 5.6.2 |
| **Three.js** | 3D rendering | 0.160.0 |
| **Vite** | Build tooling | 7.2.4 |
| **GLSL** | Custom shaders | ES 3.00 |

---

## 🎮 User Controls

### Camera Navigation
- **Left Mouse Drag** - Rotate camera around focal point
- **Right Mouse Drag** - Pan camera position
- **Mouse Wheel** - Zoom in/out
- **Auto-Rotation** - Gentle idle rotation (stops on user interaction)

### UI Interactions
- **Day/Night Toggle** - Switch between day and night visual modes
- **Cinematic Replay** - Restart the intro animation

---

## 🛠️ Development Guide

### Customizing the Starfield

The night sky features multiple star layers with different properties:

**File:** `src/effects/stars.ts`

```typescript
// Adjust star counts
const backgroundStars = createBackgroundStars(15000)  // Tiny twinkling stars
const milkyWay = createMilkyWay(8000)                 // Milky Way band with nebula
const prominentStars = createProminentStars(500)      // Large bright stars

// Modify opacity and shimmer in designSystem.ts
export const OPACITY = {
  stars: {
    shimmerMin: 0.3,  // Minimum opacity during shimmer
    shimmerMax: 0.8,  // Maximum opacity during shimmer
  }
}
```

### Customizing the Cinematic Animation

The cinematic intro focuses on specific map coordinates. To change the focal point:

**File:** `src/core/HelsinkiScene_GLB.ts` (lines 145-147)

```typescript
const mapX = 164 // Map X coordinate (right/left)
const mapY = 804 // Map Y coordinate (north/south)
```

**Coordinate System:**
- `mapX`: Positive = right, Negative = left
- `mapY`: Positive = north/up, Negative = south/down
- Origin (0, 0) at map center

### Adjusting Animation Timing

**File:** `src/animation/cinematicAnimation.ts` (lines 95-103)

```typescript
const {
  buildingX = 800,        // Focus point X
  buildingZ = -600,       // Focus point Z
  buildingY = 0,          // Focus point Y (height)
  startDistance = 3000,   // Initial camera distance
  endDistance = 380,      // Final camera distance
  startAngle = Math.PI * 0.25,     // Starting angle (45°)
  rotationAngle = Math.PI * 0.25,  // Rotation amount (45°)
  duration = 5.0,         // Animation duration (seconds)
}
```

### Modifying Visual Effects

#### City Lights Density
**File:** `src/core/HelsinkiScene_GLB.ts` (line 159)

```typescript
this.addCityLightsPoints(800) // Change count (default: 800)
```

#### Fog Distance
**File:** `src/constants/designSystem.ts` (lines 138-143)

```typescript
export const FOG = {
  near: 750,   // Fog start distance
  far: 1750,   // Fog end distance (full opacity)
  colors: {
    day: 0xFFF8F2,
    night: 0x0a0a15,
  },
}
```

### Debugging Tools

The scene is exposed to the browser console for runtime debugging:

```javascript
// Access the scene instance
window.helsinkiScene

// === Camera Utilities ===

// Get current camera position/angle info
window.helsinkiScene.debugCamera()

// Get current camera config as copyable code
window.helsinkiScene.printCameraConfig()

// Apply a preset camera view
window.helsinkiScene.applyCameraPreset('BIRDS_EYE')
// Available presets: CINEMATIC_END, BIRDS_EYE, WIDE_SHOT, CLOSE_UP

// Focus on a Point of Interest
window.helsinkiScene.focusPOI('FOUNDERS_HOUSE', 800, 135, 20)
// Parameters: (POI name, distance, azimuth°, elevation°)

// Set custom camera configuration
window.helsinkiScene.setCameraConfig({
  targetX: 164, targetY: 50, targetZ: -804,
  polar: { distance: 500, azimuth: 90, elevation: 15 },
  fov: 60
})

// List available POIs and presets
window.helsinkiScene.getPOIs()
window.helsinkiScene.getCameraPresets()

// === Other Tools ===

// Adjust pencil shader strength (0-1)
window.helsinkiScene.setPencilStrength(0.7)

// Toggle day/night mode
window.helsinkiScene.toggleDayNightMode(true)  // true = night

// Get the 3D model
window.helsinkiScene.getModel()

// Get camera controls
window.helsinkiScene.getControls()
```

---

## 📦 Model Requirements

### GLB File Specifications
- **Format:** Binary glTF (.glb)
- **Compression:** DRACO geometry compression recommended
- **Textures:** Embedded in GLB file
- **Rotation:** Model assumes -90° X-axis rotation in loader
- **Size:** Optimized for web delivery (<50MB recommended)

### Replacing the 3D Model

1. Export your model from Blender/3D software as GLB
2. Ensure textures are packed/embedded
3. Place file in `public/` directory
4. Update path in `src/loaders/modelLoader.ts` (line 130):

```typescript
modelPath: '/your-model.glb'
```

---

## 🎨 Design System

All visual constants are centralized in `src/constants/designSystem.ts`:

- **Colors** - Brand colors, day/night palettes, wireframe colors
- **Fog** - Distance and color configurations
- **Lighting** - City lights color and parameters
- **Animation** - Timing and easing functions

---

## 🐛 Common Issues & Solutions

### Issue: Model doesn't load
**Solution:** Check browser console for DRACO decoder errors. Ensure `untitled1.glb` exists in `public/` directory.

### Issue: Performance is slow
**Solution:** Reduce city lights count (line 159 in `HelsinkiScene_GLB.ts`) or disable post-processing shaders.

### Issue: Animation doesn't start
**Solution:** Ensure the cinematic animation is properly initialized after model load. Check that `cinematicAnimation.isPlaying` is set to `true` in `HelsinkiScene_GLB.ts`.

### Issue: Stars not visible at night
**Solution:** Verify that night mode is active. Stars only appear when `isNightMode` is `true`. Toggle manually or check Helsinki timezone detection.

### Issue: Loading screen stuck
**Solution:** Check that all loading phases complete properly. Verify LoadingScreen → TypingAnimation → Map viewer transition timing in `App.tsx`.

### Issue: Textures appear broken
**Solution:** Re-export GLB with "Pack Resources" and "Include → Images" enabled in Blender.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Commit with clear messages** (`git commit -m 'Add amazing feature'`)
5. **Push to your fork** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request** with detailed description

### Code Style Guidelines
- Use TypeScript strict mode
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and modular
- Update documentation for API changes

### Testing Checklist
- [ ] Dev server runs without errors
- [ ] Production build completes successfully
- [ ] Animations play smoothly (60fps)
- [ ] User controls respond correctly
- [ ] Day/night mode switches properly
- [ ] No console errors in browser

---

## 📚 Additional Resources

- **Technical Guide:** See `src/README.md` for in-depth code documentation
- **Three.js Docs:** https://threejs.org/docs/
- **GLSL Reference:** https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language
- **React Docs:** https://react.dev/

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👥 Team

Built with ❤️ by the Founders House team

**Questions?** Open an issue or reach out to the maintainers.

---

**Happy coding! 🚀**
