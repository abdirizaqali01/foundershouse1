// Post-Process Fragment Shader
// Applies pencil-sketch effect to rendered 3D scene

precision highp float;

uniform sampler2D tDiffuse;           // Rendered scene
uniform sampler2D uPerlinTexture;     // Perlin noise
uniform sampler2D uPaperTexture;      // Paper grain (optional)
uniform vec3 uPencilColor;
uniform vec3 uPaperColor;
uniform float uTime;
uniform float uPencilStrength;        // 0-1 effect intensity
uniform vec2 uResolution;

varying vec2 vUv;

// Edge detection for pencil strokes
float getEdgeStrength(sampler2D tex, vec2 uv, vec2 resolution) {
  vec2 texel = 1.0 / resolution;

  // Sobel operator for edge detection
  float tl = length(texture2D(tex, uv + vec2(-texel.x, texel.y)).rgb);
  float t  = length(texture2D(tex, uv + vec2(0.0, texel.y)).rgb);
  float tr = length(texture2D(tex, uv + vec2(texel.x, texel.y)).rgb);
  float l  = length(texture2D(tex, uv + vec2(-texel.x, 0.0)).rgb);
  float r  = length(texture2D(tex, uv + vec2(texel.x, 0.0)).rgb);
  float bl = length(texture2D(tex, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = length(texture2D(tex, uv + vec2(0.0, -texel.y)).rgb);
  float br = length(texture2D(tex, uv + vec2(texel.x, -texel.y)).rgb);

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  return length(vec2(gx, gy));
}

// Random2D function
float random2d(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Sample original scene
  vec4 sceneColor = texture2D(tDiffuse, vUv);

  // Detect edges
  float edgeStrength = getEdgeStrength(tDiffuse, vUv, uResolution);
  edgeStrength = smoothstep(0.05, 0.15, edgeStrength);

  // Sample Perlin noise for organic variation
  vec2 perlinUv = vUv * 4.0 + uTime * 0.0001;
  float perlinValue = texture2D(uPerlinTexture, perlinUv).r;

  // Add subtle grain
  vec2 grainUv = vUv * 2.0;
  float grain = random2d(grainUv + uTime * 0.0001) * 0.05;

  // Mix pencil color on edges
  vec3 finalColor = sceneColor.rgb;

  // Apply pencil strokes to edges
  float pencilMask = edgeStrength * (0.8 + perlinValue * 0.4);
  finalColor = mix(finalColor, uPencilColor * 0.7, pencilMask * uPencilStrength);

  // Apply paper texture (subtle)
  finalColor = mix(finalColor, uPaperColor, (1.0 - sceneColor.a) * 0.2);

  // Add grain
  finalColor += grain;

  // (no desaturation)

  gl_FragColor = vec4(finalColor, 1.0);
}
