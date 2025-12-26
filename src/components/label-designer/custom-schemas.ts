/**
 * Custom pdfme schemas with modifications for better UX
 * - Rectangle/Ellipse with decimal borderWidth support (step: 0.1 instead of 1)
 */

import type { Plugin } from '@pdfme/common'

/**
 * Creates a modified rectangle plugin that allows decimal borderWidth values
 */
export function createCustomRectangle(originalPlugin: Plugin<any>): Plugin<any> {
  return {
    ...originalPlugin,
    propPanel: {
      ...originalPlugin.propPanel,
      schema: (args: any) => {
        const originalSchema = originalPlugin.propPanel.schema(args)
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
        const originalSchema = originalPlugin.propPanel.schema(args)
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
