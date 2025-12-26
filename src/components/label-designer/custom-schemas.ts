/**
 * Custom pdfme schemas with modifications for better UX
 * - Rectangle/Ellipse with decimal borderWidth support (step: 0.1 instead of 1)
 */

import type { Plugin } from '@pdfme/common'

/**
 * Helper to get schema from propPanel (can be function or object)
 */
function getSchema(propPanel: any, args: any): Record<string, any> {
  return typeof propPanel.schema === 'function'
    ? propPanel.schema(args)
    : propPanel.schema
}

/**
 * Creates a modified rectangle plugin that allows decimal borderWidth values
 */
export function createCustomRectangle(originalPlugin: Plugin<any>): Plugin<any> {
  return {
    ...originalPlugin,
    propPanel: {
      ...originalPlugin.propPanel,
      schema: (args: any) => {
        const originalSchema = getSchema(originalPlugin.propPanel, args)
        return {
          ...originalSchema,
          borderWidth: {
            ...originalSchema.borderWidth,
            step: 0.1, // Allow decimal values (0.1, 0.2, 0.3, etc.)
          },
        }
      },
    },
  }
}

/**
 * Creates a modified line plugin that allows decimal strokeWidth values
 */
export function createCustomLine(originalPlugin: Plugin<any>): Plugin<any> {
  return {
    ...originalPlugin,
    propPanel: {
      ...originalPlugin.propPanel,
      schema: (args: any) => {
        const originalSchema = getSchema(originalPlugin.propPanel, args)
        // Check if strokeWidth exists in the schema
        if (originalSchema.strokeWidth) {
          return {
            ...originalSchema,
            strokeWidth: {
              ...originalSchema.strokeWidth,
              step: 0.1, // Allow decimal values
            },
          }
        }
        return originalSchema
      },
    },
  }
}
