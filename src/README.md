# Founders House 3D Viewer - Source Code Guide

Welcome to the FH 3D Viewer codebase! This guide will help you understand the project structure and make common changes.

## 📁 Project Structure

```
src/
├── animation/          # Camera animations and motion controllers
├── components/         # React components (UI and loading screens)
├── constants/          # Design system constants (colors, fog, POIs)
├── core/              # Main 3D scene logic and managers
├── effects/           # Visual effects (fog, lights, stars)
├── helpers/           # Utility functions and device detection
├── loaders/           # 3D model loading with DRACO compression
├── rendering/         # Lighting and post-processing
├── shaders/           # Custom GLSL shaders
└── types/             # TypeScript type definitions
```

---

## 🎬 Animation System

### Location: `src/animation/`

#### Cinematic Intro Animation (`cinematicAnimation.ts`)
The dramatic opening camera movement when the page loads.

**Key Settings You Can Change:**

```typescript
// Duration of the animation
duration = 5.0  // In seconds (line ~87)

// Easing curve - controls speed gradient
cubic-bezier(0.16, 0.84, 0.44, 1)  // (line ~55)
// Change these values for different feels:
// - (0.25, 0.1, 0.25, 1) = CSS 'ease' (more acceleration)
// - (0, 0, 0.58, 1) = CSS 'ease-out' (faster start)
// - (0.42, 0, 0.58, 1) = CSS 'ease-in-out' (smooth S-curve)

// Camera start/end positions
startDistance = 3000    // How far away camera starts
endDistance = 380       // How close camera ends up
startAngle = Math.PI * 0.25  // Starting angle (45°)
rotationAngle = Math.PI * 0.25  // How much to rotate (45°)
```

**To change the camera path:**
Edit `createCinematicAnimation()` in `cinematicAnimation.ts` (lines ~80-120)

#### Idle Rotation (`idleRotation.ts`)
The gentle orbital rotation after the intro completes.

**Key Settings:**

```typescript
// Rotation speed
rotationSpeed: -(Math.PI * 1) / 100  // (line ~42)
// Negative = counterclockwise
// 100 = seconds for full 360° rotation
// To make faster: decrease 100 (e.g., 80)
// To make slower: increase 100 (e.g., 120)

// When it starts during cinematic
progress >= 0.80  // 80% = 1 second before end (HelsinkiScene_GLB.ts line ~260)
```

---

## 🌫️ Fog System

### Location: `src/effects/fogManager.ts` and `src/constants/designSystem.ts`

**Fog Settings:**

```typescript
// In constants/designSystem.ts (line ~30)
export const FOG = {
  near: 1000,        // Where fog starts
  far: 2800,         // Where fog is fully opaque
  colors: {
    day: 0xf5f5dc,   // Beige fog color
    night: 0x1a1a2e  // Dark blue fog color
  }
}
```

**To adjust fog visibility:**
- Increase `near` → fog starts further away (less fog)
- Decrease `near` → fog starts closer (more fog)
- Increase `far` → fog extends further (larger visible area)
- Decrease `far` → fog ends closer (smaller visible area)

**Fog fade-in timing:**
The fog fades in using the same easing as the camera (starts at 0%, fully visible at 100%).
Edit in `HelsinkiScene_GLB.ts` around line ~275.

---

## ✨ Starfield System

### Location: `src/effects/stars.ts`

The night sky features a multi-layered starfield system with realistic effects:

**Star Layers:**

```typescript
// Background stars (tiny twinkling base layer)
const backgroundStars = createBackgroundStars(15000)
// Size: 2.44px, Opacity: 0.732, White color

// Milky Way (dense galactic band)
const milkyWay = createMilkyWay(8000)
// Contains 3 nebula clusters (pink, blue, purple)
// Core stars with varied colors (blue-white to warm yellow)

// Prominent stars (large bright individual stars)
const prominentStars = createProminentStars(500)
// Size: 6.1px, Opacity: 1.0, Yellowish-white color
```

**Customizing Star Appearance:**

```typescript
// In constants/designSystem.ts
export const SCENE_CONFIG = {
  stars: {
    radiusMin: 800,          // Inner dome radius
    radiusMax: 1000,         // Outer dome radius
    shimmerSpeed: 0.3,       // Twinkle animation speed
  }
}

export const OPACITY = {
  stars: {
    shimmerMin: 0.3,  // Minimum shimmer opacity
    shimmerMax: 0.8,  // Maximum shimmer opacity
  }
}
```

**To add more/fewer stars:**
Edit the count parameters in `createStarfield()` function (stars.ts, lines ~15-27)

**Star Animation:**
Stars use a gentle sine-wave shimmer instead of discrete blinking to prevent jarring simultaneous flashes. The shimmer is controlled by `animateStars()` and `animateStarLayer()` functions.

---

## 🎨 UI & Styling

### Location: `src/components/`

#### Loading Screen Sequence

The app uses a three-phase loading sequence:

1. **LoadingScreen** (`LoadingScreen.tsx`)
   - Displays logo with fade-in animation
   - Duration: 3.5 seconds
   - Background: `#FFF8F2` (cream)

2. **TypingAnimation** (`TypingAnimation.tsx`)
   - Two sequential typing messages:
     - "Founders House: The next generation of obsessed builders"
     - "Where ambition concentrates, potential multiplies"
   - First message backspaces before second types
   - Slides up to reveal map after completion
   - Centered text at 80% viewport width

3. **Map Viewer** (`HelsinkiViewer.tsx`)
   - Main 3D scene with cinematic animation
   - Slides up from bottom with 0.8s transition

**To adjust loading timing:**
```typescript
// In LoadingScreen.tsx (line ~20)
setTimeout(() => onComplete(), 3500)  // Change 3500 (ms)

// In TypingAnimation.tsx
const typingSpeed = 30      // Characters per second
const eraseSpeed = 50       // Backspace speed
const slideOutDuration = 800 // Slide animation (ms)
```

#### Logo (`HelsinkiViewer.tsx` line ~195)
```tsx
<img src="/FHLOGO.png" alt="FH Logo" className="fh-logo" />
```
- Replace `/FHLOGO.png` with your logo filename in `/public/` folder
- Adjust size in `HelsinkiViewer.css` (`.fh-logo` height, line ~48)

#### Controls Panel (`HelsinkiViewer.tsx` lines ~205-230)
The render mode selector in the top-right corner.

**To hide controls:**
```tsx
// Comment out or delete lines ~205-230 in HelsinkiViewer.tsx
```

#### Colors (`HelsinkiViewer.css`)
```css
/* Background */
background: #fdfcf5  /* Warm beige (line ~11) */

/* Control panel */
background: rgba(253, 252, 245, 0.95)  /* Semi-transparent beige (line ~55) */

/* Text colors */
color: #625e54  /* Muted brown (line ~70) */
```

---

## 💡 Lighting

### Location: `src/rendering/lighting.ts`

```typescript
// Main directional light (sun)
intensity: 1.2        // Brightness (line ~16)
position: (5, 10, 7)  // Light angle (line ~18)

// Ambient light (general illumination)
intensity: 0.6        // Overall brightness (line ~24)
```

**To make scene brighter:** Increase both intensities
**To make scene darker:** Decrease both intensities
**To change sun angle:** Modify position values

---

## 🏗️ 3D Model

### Location: `public/untitled.glb` and `src/loaders/modelLoader.ts`

**To replace the 3D model:**
1. Export your model as `.glb` format
2. Place it in `/public/` folder
3. Update the path in `HelsinkiScene_GLB.ts` (line ~182):
   ```typescript
   const modelPath = '/your-model-name.glb'
   ```

**Model requirements:**
- Format: `.glb` (GLTF binary)
- Recommended size: Under 30MB for good performance
- Center your model at origin (0, 0, 0) in Blender/your 3D software

---

## ⚡ Performance Tips

### Fog Culling for Multiple Tiles
If you want to add more map tiles without performance issues:

1. Create `src/core/TileManager.ts` (see commented example in codebase)
2. Tiles load/unload based on fog distance
3. Only visible tiles are in memory

### Camera Controls
User can interact with the camera after cinematic:
- **Left mouse drag**: Rotate view
- **Right mouse drag**: Pan
- **Scroll wheel**: Zoom
- **8 seconds of inactivity**: Resume idle rotation

---

## 🎯 Common Changes

### 1. Make Animation Faster/Slower
```typescript
// In cinematicAnimation.ts (line ~87)
duration = 3.0  // Faster (was 5.0)
duration = 7.0  // Slower
```

### 2. Change Rotation Direction
```typescript
// In idleRotation.ts (line ~42)
rotationSpeed: -(Math.PI * 1) / 100  // Counterclockwise (negative)
rotationSpeed: (Math.PI * 1) / 100   // Clockwise (positive)
```

### 3. Disable Idle Rotation Completely
```typescript
// In HelsinkiScene_GLB.ts (lines ~258-265)
// Comment out or delete the idle rotation creation block
/*
if (progress >= 0.80 && !this.idleRotation) {
  const mapCenter = new THREE.Vector3(0, 0, 0)
  this.idleRotation = createIdleRotation(this.camera, mapCenter, elapsed)
}
*/
```

### 4. Change Fog Color
```typescript
// In constants/designSystem.ts (line ~34)
colors: {
  day: 0xFFFFFF,   // White fog
  night: 0x000033  // Dark blue fog
}
```

### 5. Adjust Camera Starting Position
```typescript
// In cinematicAnimation.ts (line ~115-120)
const startPosition = new THREE.Vector3(
  buildingX + Math.cos(startAngle) * startDistance,
  buildingY + 2000,  // Increase for higher start
  buildingZ + Math.sin(startAngle) * startDistance
)
```

### 6. Change Star Count
```typescript
// In stars.ts createStarfield() function
const backgroundStars = createBackgroundStars(20000)  // More stars (was 15000)
const milkyWay = createMilkyWay(10000)                // Denser Milky Way (was 8000)
const prominentStars = createProminentStars(1000)     // More bright stars (was 500)
```

### 7. Adjust Loading Screen Duration
```typescript
// In LoadingScreen.tsx (line ~20)
setTimeout(() => onComplete(), 2000)  // Faster (was 3500ms)

// In TypingAnimation.tsx
const typingSpeed = 50  // Faster typing (was 30)
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🐛 Troubleshooting

### Animation looks choppy
- Check browser performance (open DevTools → Performance tab)
- Reduce model polygon count
- Lower fog `far` distance to render less geometry

### Fog not visible
- Increase fog density: decrease `near` and `far` values
- Check scene background color matches fog color

### Model not loading
- Check file path in `HelsinkiScene_GLB.ts`
- Verify `.glb` file is in `/public/` folder
- Check browser console for error messages

### Transition between animations is visible
- Start idle rotation earlier (decrease 0.80 value in `HelsinkiScene_GLB.ts`)
- Increase animation duration for smoother deceleration

### Stars not appearing in night mode
- Check that `isNightMode` is true in the scene
- Verify star creation in `createStarfield()` is being called
- Ensure stars are added to the scene with `scene.add(starGroup)`

### Loading screen issues
- Check timing in `App.tsx` phase transitions
- Verify LoadingScreen and TypingAnimation components are rendering
- Check CSS animations in respective `.css` files

---

## 📚 Key Technologies

- **Three.js**: 3D rendering engine
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **GLSL**: Shader programming language

---

## 🤝 Contributing

When making changes:
1. Test in development mode first (`npm run dev`)
2. Build for production (`npm run build`)
3. Check for TypeScript errors
4. Test in multiple browsers (Chrome, Firefox, Safari)

---

## 📞 Need Help?

- Check the inline code comments for detailed explanations
- Review Three.js docs: https://threejs.org/docs/
- Look at similar examples: https://threejs.org/examples/

Happy coding! 🚀
