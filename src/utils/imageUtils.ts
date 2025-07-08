/**
 * Utility functions for image processing and compression
 */

export interface CompressedImage {
  dataUrl: string
  size: number
  width: number
  height: number
}

/**
 * Compress an image file to reduce size while maintaining reasonable quality
 */
export const compressImage = (
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.7
): Promise<CompressedImage> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and compress image
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to compressed data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        
        resolve({
          dataUrl,
          size: Math.round((dataUrl.length * 3) / 4), // Approximate size in bytes
          width: Math.round(width),
          height: Math.round(height)
        })
      } else {
        reject(new Error('Could not get canvas context'))
      }
      
      // Clean up object URL after processing
      URL.revokeObjectURL(objectUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image'))
    }
    
    // Create object URL for the file
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
  })
}

/**
 * Validate image file type and size
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no válido. Use JPG, PNG o WebP.'
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo es demasiado grande. Máximo 5MB.'
    }
  }

  return { valid: true }
}

/**
 * Create a placeholder image data URL
 */
export const createPlaceholderImage = (width: number = 200, height: number = 200): string => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = width
  canvas.height = height
  
  if (ctx) {
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Add package icon
    ctx.fillStyle = '#9ca3af'
    ctx.font = `${Math.min(width, height) / 4}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📦', width / 2, height / 2)
    
    return canvas.toDataURL('image/jpeg', 0.8)
  }
  
  return ''
}