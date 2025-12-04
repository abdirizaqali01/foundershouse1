# Helsinki 3D Viewer

A WebGL-based 3D visualization of Helsinki with custom pencil-sketch rendering effects, built with React, TypeScript, and Three.js.

## Features

- Interactive 3D city visualization using GLB models
- Custom GLSL shaders for pencil sketch effect
- Post-processing pipeline with edge detection
- Perlin noise-based organic animations
- Orbit controls for navigation
- Loading progress indicator
- Responsive design

## Tech Stack

- React 19 + TypeScript
- Three.js for 3D rendering
- GSAP for animations
- Vite for build tooling
- Custom GLSL shaders

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

Place your GLB model file in the `public` directory and update the path in [src/components/HelsinkiViewer.tsx](src/components/HelsinkiViewer.tsx).

**Note:** GLB files are excluded from git by default (see [.gitignore](.gitignore)). Store large 3D models separately or use Git LFS.

### Controls

- **Left mouse drag**: Rotate camera
- **Right mouse drag**: Pan camera
- **Mouse wheel**: Zoom in/out

### Pencil Effect

Use the UI buttons to adjust the pencil shader strength:
- **No Effect**: Disable shader
- **Light**: 50% effect
- **Full Pencil**: 100% effect

## Project Structure

```
foundershouse/
├── src/
│   ├── components/       # React components
│   ├── shaders/         # GLSL shader files
│   ├── utils/           # Three.js scene setup and utilities
│   ├── App.tsx
│   └── main.tsx
├── public/              # Static assets
├── index.html
└── vite.config.ts
```

## Development

The scene is exposed to `window.helsinkiScene` for debugging in the browser console.

```javascript
// Adjust pencil strength programmatically
window.helsinkiScene.setPencilStrength(0.7)

## License

MIT
