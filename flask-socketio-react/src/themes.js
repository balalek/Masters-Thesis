import { createTheme } from '@mui/material/styles';

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
  },
});

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
  },
});