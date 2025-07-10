/**
 * Utility functions for promotion calculations and validation
 */

import { Promotion, Product } from '../lib/supabase'

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface PromotionResult {
  promotion: Promotion
  discountAmount: number
  applicableItems: CartItem[]
  description: string
}

/**
 * Check if a promotion is currently valid
 */
export const isPromotionValid = (promotion: Promotion, purchaseAmount: number = 0): boolean => {
  const now = new Date()
  const startDate = new Date(promotion.start_date)
  const endDate = new Date(promotion.end_date)

  // Check if promotion is active
  if (!promotion.is_active) return false

  // Check date range
  if (now < startDate || now > endDate) return false

  // Check minimum purchase amount
  if (purchaseAmount < promotion.min_purchase_amount) return false

  // Check usage limit
  if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) return false

  return true
}

/**
 * Calculate discount amount for a promotion
 */
export const calculatePromotionDiscount = (
  promotion: Promotion,
  cartItems: CartItem[],
  subtotal: number
): PromotionResult => {
  let discountAmount = 0
  let applicableItems: CartItem[] = []
  let description = ''

  // Filter items that are eligible for this promotion
  const eligibleItems = cartItems.filter(item => {
    // Check if product is specifically included
    const productIncluded = promotion.promotion_products?.some(pp => pp.product_id === item.product.id)
    
    // Check if product's category is included
    const categoryIncluded = promotion.promotion_categories?.some(pc => pc.category_id === item.product.category_id)
    
    // If no specific products or categories are set, apply to all
    const noRestrictions = (!promotion.promotion_products || promotion.promotion_products.length === 0) &&
                          (!promotion.promotion_categories || promotion.promotion_categories.length === 0)
    
    return productIncluded || categoryIncluded || noRestrictions
  })

  if (eligibleItems.length === 0) {
    return {
      promotion,
      discountAmount: 0,
      applicableItems: [],
      description: 'No hay productos elegibles para esta promoción'
    }
  }

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.totalPrice, 0)

  switch (promotion.type) {
    case 'percentage':
      discountAmount = eligibleSubtotal * (promotion.value / 100)
      applicableItems = eligibleItems
      description = `${promotion.value}% de descuento en productos elegibles`
      break

    case 'fixed_amount':
      discountAmount = Math.min(promotion.value, eligibleSubtotal)
      applicableItems = eligibleItems
      description = `Descuento fijo de ${formatCurrency(promotion.value)}`
      break

    case 'buy_x_get_y':
      const buyQuantity = promotion.conditions?.buy_quantity || 1
      const getQuantity = promotion.conditions?.get_quantity || 1
      
      eligibleItems.forEach(item => {
        const freeItems = Math.floor(item.quantity / buyQuantity) * getQuantity
        const freeItemsDiscount = Math.min(freeItems, item.quantity) * item.unitPrice
        discountAmount += freeItemsDiscount
        
        if (freeItems > 0) {
          applicableItems.push(item)
        }
      })
      
      description = `Compra ${buyQuantity} y lleva ${getQuantity} gratis`
      break

    case 'bundle':
      // For bundle promotions, apply the discount if all required products are in cart
      const bundleProducts = promotion.conditions?.bundle_products || []
      const hasAllBundleProducts = bundleProducts.every(productId =>
        cartItems.some(item => item.product.id === productId)
      )
      
      if (hasAllBundleProducts) {
        discountAmount = promotion.value
        applicableItems = cartItems.filter(item => 
          bundleProducts.includes(item.product.id)
        )
        description = 'Descuento por paquete especial'
      } else {
        description = 'Faltan productos para completar el paquete'
      }
      break

    default:
      description = 'Tipo de promoción no reconocido'
  }

  // Ensure discount doesn't exceed eligible subtotal
  discountAmount = Math.min(discountAmount, eligibleSubtotal)

  return {
    promotion,
    discountAmount,
    applicableItems,
    description
  }
}

/**
 * Find the best promotion for a given cart
 */
export const findBestPromotion = (
  promotions: Promotion[],
  cartItems: CartItem[],
  subtotal: number
): PromotionResult | null => {
  const validPromotions = promotions.filter(promotion => 
    isPromotionValid(promotion, subtotal)
  )

  if (validPromotions.length === 0) return null

  let bestPromotion: PromotionResult | null = null
  let maxDiscount = 0

  validPromotions.forEach(promotion => {
    const result = calculatePromotionDiscount(promotion, cartItems, subtotal)
    
    if (result.discountAmount > maxDiscount) {
      maxDiscount = result.discountAmount
      bestPromotion = result
    }
  })

  return bestPromotion
}

/**
 * Get all applicable promotions for a cart (not just the best one)
 */
export const getApplicablePromotions = (
  promotions: Promotion[],
  cartItems: CartItem[],
  subtotal: number
): PromotionResult[] => {
  const validPromotions = promotions.filter(promotion => 
    isPromotionValid(promotion, subtotal)
  )

  return validPromotions
    .map(promotion => calculatePromotionDiscount(promotion, cartItems, subtotal))
    .filter(result => result.discountAmount > 0)
    .sort((a, b) => b.discountAmount - a.discountAmount)
}

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'COP'
  }).format(amount)
}

/**
 * Validate promotion data before saving
 */
export const validatePromotionData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.name?.trim()) {
    errors.push('El nombre de la promoción es requerido')
  }

  if (!data.type) {
    errors.push('El tipo de promoción es requerido')
  }

  if (!data.value || parseFloat(data.value) <= 0) {
    errors.push('El valor de la promoción debe ser mayor a 0')
  }

  if (data.type === 'percentage' && parseFloat(data.value) > 100) {
    errors.push('El porcentaje de descuento no puede ser mayor a 100%')
  }

  if (!data.start_date) {
    errors.push('La fecha de inicio es requerida')
  }

  if (!data.end_date) {
    errors.push('La fecha de fin es requerida')
  }

  if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
    errors.push('La fecha de fin debe ser posterior a la fecha de inicio')
  }

  if (data.type === 'buy_x_get_y') {
    if (!data.conditions?.buy_quantity || parseInt(data.conditions.buy_quantity) <= 0) {
      errors.push('La cantidad a comprar debe ser mayor a 0')
    }
    if (!data.conditions?.get_quantity || parseInt(data.conditions.get_quantity) <= 0) {
      errors.push('La cantidad gratis debe ser mayor a 0')
    }
  }

  if (data.max_uses && parseInt(data.max_uses) <= 0) {
    errors.push('El límite de usos debe ser mayor a 0')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate promotion preview text
 */
export const generatePromotionPreview = (promotion: Promotion): string => {
  switch (promotion.type) {
    case 'percentage':
      return `${promotion.value}% de descuento`
    
    case 'fixed_amount':
      return `${formatCurrency(promotion.value)} de descuento`
    
    case 'buy_x_get_y':
      const buyQty = promotion.conditions?.buy_quantity || 1
      const getQty = promotion.conditions?.get_quantity || 1
      return `Compra ${buyQty} y lleva ${getQty} gratis`
    
    case 'bundle':
      return `Paquete especial con ${formatCurrency(promotion.value)} de descuento`
    
    default:
      return 'Promoción especial'
  }
}