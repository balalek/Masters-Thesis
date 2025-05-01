/**
 * @fileoverview Custom scrollbar styling for components
 * 
 * This module provides:
 * - Consistent scrollbar styling across the application
 * - Customized width, border radius, and colors for scrollbars
 * - Hover state styling for improved user experience
 * - WebKit-specific implementation for Chrome, Safari, and newer Edge
 * 
 * @module Utils/ScrollbarStyle
 */

/**
 * Standardized scrollbar styling object for use with MUI components
 * 
 * Can be spread into the sx prop of any MUI component that needs
 * scrollable content with a custom scrollbar appearance.
 * 
 * @constant
 * @type {Object}
 */
export const scrollbarStyle = {
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  }
};