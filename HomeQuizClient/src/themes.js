/**
 * @fileoverview Application theme definitions for light and dark modes
 * @author Bc. Martin Baláž
 * @module Themes
 */
import { createTheme } from '@mui/material/styles';

/**
 * Light theme configuration for the application
 * 
 * Defines color palette for light mode with blue primary color
 * and green secondary color on light backgrounds.
 * 
 * @constant
 * @type {Object}
 */
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2ecc71',
    },
    background: {
      default: '#f0f0f0',
    },
    text: {
      primary: '#333',
    },
    bar: {
      main: '#8e8e8e',
    }
  }
});

/**
 * Dark theme configuration for the application
 * 
 * Defines color palette for dark mode with teal primary color
 * and red secondary color on dark backgrounds.
 * 
 * @constant
 * @type {Object}
 */
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1abc9c',
    },
    secondary: {
      main: '#e74c3c',
    },
    background: {
      default: '#333',
    },
    text: {
      primary: '#f0f0f0',
    },
    bar: {
      main: '#212121',
    }
  }
});