import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { CAMERA_BASE } from '../constants/cameraConfig';
import { applyCameraConfig } from '../helpers/cameraUtils';
import { FOG } from '../constants/designSystem';

interface HelsinkiViewerSimpleProps {
  environmentColor?: string;
  scrollProgress?: number; // 0 (top) to 1 (bottom)
}

const MODEL_PATH = "/coolest_model.glb"; // Change to your model path


const HelsinkiViewerSimple: React.FC<HelsinkiViewerSimpleProps> = ({ environmentColor = "#1a1a2e", scrollProgress = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(environmentColor);
    // Add Three.js fog effect with color matching environmentColor
    const fogColor = new THREE.Color(environmentColor);
    scene.fog = new THREE.Fog(
      fogColor,
      FOG.near,
      FOG.far
    );

    // Use CAMERA_BASE for camera setup
    const camera = new THREE.PerspectiveCamera(
      CAMERA_BASE.fov,
      mount.clientWidth / mount.clientHeight,
      CAMERA_BASE.near,
      CAMERA_BASE.far
    );

    // Camera animation parameters
    // Start: original position/rotation, End: closer to ground, tilted up
    const startPos = new THREE.Vector3(
      CAMERA_BASE.position.x,
      CAMERA_BASE.position.y,
      CAMERA_BASE.position.z
    );
    const endPos = new THREE.Vector3(
      0, // Move to center
      0, // Lower Y (closer to ground)
      0 // Move closer in Z
    );
    const startRotX = camera.rotation.x; // Initial tilt
    const endRotX = -Math.PI / 6; // Tilt up (towards horizon)

    // Set initial camera position
    camera.position.copy(startPos);
    camera.lookAt(CAMERA_BASE.target.x, CAMERA_BASE.target.y, CAMERA_BASE.target.z);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);


    // Setup DRACOLoader for Draco-compressed GLB support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(MODEL_PATH, (gltf) => {
      const model = gltf.scene;
      // --- Apply main viewer transforms (rotation, centering) ---
      model.rotation.x = -Math.PI / 2;
      model.scale.set(1, 1, 1);
      model.updateMatrixWorld(true);
      const rotatedBox = new THREE.Box3().setFromObject(model);
      const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
      model.position.set(-rotatedCenter.x, -rotatedCenter.y, -rotatedCenter.z);
      scene.add(model);

    });

    // Animate camera on scroll
    const animate = () => {
      // Interpolate camera position and rotation based on scrollProgress
      const t = scrollProgress;
      camera.position.lerpVectors(startPos, endPos, t);
      // Look at the model center, but tilt up as we scroll
      const lookTarget = new THREE.Vector3(CAMERA_BASE.target.x, CAMERA_BASE.target.y, CAMERA_BASE.target.z);
      camera.lookAt(lookTarget);
      // Apply tilt (rotation.x) by rotating camera up as we scroll
      camera.rotation.x = THREE.MathUtils.lerp(startRotX, endRotX, t);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [environmentColor, scrollProgress]);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh", minHeight: 400, background: environmentColor }} />;
};

export default HelsinkiViewerSimple;
