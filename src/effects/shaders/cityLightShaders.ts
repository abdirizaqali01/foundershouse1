/**
 * City Light Shaders
 * Custom shader code for city lights with fog support
 */

export const cityLightVertexShader = `
  attribute float flickerState;
  attribute vec3 customColor;
  varying float vFlickerState;
  varying vec3 vColor;
  varying float vFogDepth;

  void main() {
    vFlickerState = flickerState;
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    gl_PointSize = 15.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const cityLightFragmentShader = `
  uniform sampler2D pointTexture;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying float vFlickerState;
  varying vec3 vColor;
  varying float vFogDepth;

  void main() {
    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
    float opacity = vFlickerState * texColor.a;
    vec4 baseColor = vec4(vColor, opacity);

    // Apply fog
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor = mix(baseColor, vec4(fogColor, baseColor.a), fogFactor);
  }
`

export const glowVertexShader = `
  attribute float flickerState;
  varying float vFlickerState;
  varying float vFogDepth;

  void main() {
    vFlickerState = flickerState;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    gl_PointSize = 80.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const glowFragmentShader = `
  uniform sampler2D pointTexture;
  uniform vec3 color;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying float vFlickerState;
  varying float vFogDepth;

  void main() {
    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
    float opacity = vFlickerState * 0.6 * texColor.a;
    vec4 baseColor = vec4(color, opacity);

    // Apply fog
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor = mix(baseColor, vec4(fogColor, baseColor.a), fogFactor);
  }
`
