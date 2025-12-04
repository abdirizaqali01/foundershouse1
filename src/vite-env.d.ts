/// <reference types="vite/client" />

// GLSL shader imports
declare module '*.glsl' {
  const content: string
  export default content
}

declare module '*.glsl?raw' {
  const content: string
  export default content
}
