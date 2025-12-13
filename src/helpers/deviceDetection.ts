/**
 * Device Detection Utilities
 * Detect device capabilities to load appropriate assets
 */

export interface DeviceCapabilities {
  isMobile: boolean
  isTablet: boolean
  isLowEndDevice: boolean
  hasSlowConnection: boolean
  recommendedModelSize: 'mobile' | 'tablet' | 'desktop'
}

/**
 * Detect if user is on mobile device
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/**
 * Detect if user is on tablet
 */
export function isTabletDevice(): boolean {
  const ua = navigator.userAgent
  return (
    /iPad/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
    (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform))
  )
}

/**
 * Detect low-end device based on hardware capabilities
 */
export function isLowEndDevice(): boolean {
  // Check CPU cores
  const cores = navigator.hardwareConcurrency || 4
  if (cores <= 2) return true

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory && deviceMemory <= 4) return true

  // Check if mobile (generally less powerful)
  if (isMobileDevice() && !isTabletDevice()) return true

  return false
}

/**
 * Detect slow network connection
 */
export function hasSlowConnection(): boolean {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (!connection) return false

  // Check effective type (2g, 3g, 4g, slow-2g)
  if (connection.effectiveType && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    return true
  }

  // Check if save data is enabled
  if (connection.saveData) return true

  // Check downlink speed (in Mbps)
  if (connection.downlink && connection.downlink < 1.5) return true

  return false
}

/**
 * Get device capabilities object
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const isMobile = isMobileDevice()
  const isTablet = isTabletDevice()
  const isLowEnd = isLowEndDevice()
  const slowConnection = hasSlowConnection()

  let recommendedModelSize: 'mobile' | 'tablet' | 'desktop' = 'desktop'

  if (isMobile || isLowEnd || slowConnection) {
    recommendedModelSize = 'mobile'
  } else if (isTablet) {
    recommendedModelSize = 'tablet'
  }

  return {
    isMobile,
    isTablet,
    isLowEndDevice: isLowEnd,
    hasSlowConnection: slowConnection,
    recommendedModelSize,
  }
}

/**
 * Get recommended model path based on device capabilities
 */
export function getRecommendedModelPath(
  mobilePath = '/helsinki_mobile.glb',
  tabletPath = '/helsinki_tablet.glb',
  desktopPath = '/helsinki_desktop.glb'
): string {
  const capabilities = getDeviceCapabilities()

  console.log('📱 DEVICE DETECTION:', {
    mobile: capabilities.isMobile,
    tablet: capabilities.isTablet,
    lowEnd: capabilities.isLowEndDevice,
    slowConnection: capabilities.hasSlowConnection,
    recommended: capabilities.recommendedModelSize,
  })

  switch (capabilities.recommendedModelSize) {
    case 'mobile':
      return mobilePath
    case 'tablet':
      return tabletPath
    default:
      return desktopPath
  }
}

/**
 * Log device information for debugging
 */
export function logDeviceInfo(): void {
  const capabilities = getDeviceCapabilities()
  
  console.log('🔍 DEVICE INFORMATION:')
  console.log('   User Agent:', navigator.userAgent)
  console.log('   Platform:', navigator.platform)
  console.log('   CPU Cores:', navigator.hardwareConcurrency || 'unknown')
  console.log('   Device Memory:', (navigator as any).deviceMemory || 'unknown', 'GB')
  console.log('   Screen Resolution:', `${window.screen.width}x${window.screen.height}`)
  console.log('   Pixel Ratio:', window.devicePixelRatio)
  console.log('   Touch Points:', navigator.maxTouchPoints || 0)
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (connection) {
    console.log('   Network Type:', connection.effectiveType || 'unknown')
    console.log('   Downlink Speed:', connection.downlink || 'unknown', 'Mbps')
    console.log('   Save Data:', connection.saveData || false)
  }
  
  console.log('   Is Mobile:', capabilities.isMobile)
  console.log('   Is Tablet:', capabilities.isTablet)
  console.log('   Is Low-End:', capabilities.isLowEndDevice)
  console.log('   Slow Connection:', capabilities.hasSlowConnection)
  console.log('   ✅ Recommended Model Size:', capabilities.recommendedModelSize.toUpperCase())
}
