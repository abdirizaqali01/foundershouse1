// Pencil Sketch Fragment Shader
// Based on Chartogne-Taillet implementation
// Creates organic, hand-drawn pencil effect using Perlin noise

precision highp float;

uniform vec3 uPencilColor;
uniform vec3 uPaperColor;
uniform sampler2D uRevealTexture;     // Perlin noise texture
uniform float uRevealProgress;         // 0-1 animation progress
uniform float uTime;
uniform vec2 uTextureFrequency;        // Perlin sampling frequency
uniform vec2 uRandomFrequency;         // Grid randomization frequency
uniform float uScaffoldingAmplitude;   // Organic offset strength
uniform vec2 uParallax;                // Mouse parallax offset

varying vec2 vUv;
varying vec3 vPosition;

// Random2D function for grid-based randomization
float random2d(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Perlin-based reveal progress
// Creates organic, non-uniform reveal animation
float getPerlinProgress(
  vec2 uv,
  sampler2D perlinTexture,
  vec2 textureFreq,
  vec2 randomFreq,
  float progress,
  float time
) {
  // Sample Perlin noise at specified frequency
  vec2 perlinUv = uv * textureFreq;
  float perlinValue = texture2D(perlinTexture, perlinUv).r;

  // Create grid-based random offset
  vec2 gridUv = floor(uv * randomFreq);
  float randomValue = random2d(gridUv + time * 0.0001);

  // Calculate reveal threshold with scaffolding
  float scaffolding = uScaffoldingAmplitude;
  float threshold = 1.0 + randomValue * scaffolding + perlinValue - (1.0 - progress) * (scaffolding + 2.0);

  // Step function for binary reveal (drawn vs not drawn)
  return step(0.5, threshold);
}

void main() {
  // Apply parallax offset for depth effect
  vec2 parallaxUv = vUv;
  parallaxUv -= vec2(0.5);
  parallaxUv *= vec2(0.92);
  parallaxUv += vec2(0.5);
  parallaxUv += uParallax * 0.08;

  // Get reveal progress from Perlin noise
  float revealProgress = getPerlinProgress(
    vUv,
    uRevealTexture,
    uTextureFrequency,
    uRandomFrequency,
    uRevealProgress,
    uTime
  );

  // Base paper color
  vec3 color = uPaperColor;

  // Mix in pencil strokes
  // Using darker pencil color (0.7 multiplier for authenticity)
  float pencilStrength = 1.0 - revealProgress;
  color = mix(color, uPencilColor * 0.7, pencilStrength);

  // Output with reveal alpha
  gl_FragColor = vec4(color, revealProgress);
}
