// Post-Process Vertex Shader
// For full-screen pencil effect overlay

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
