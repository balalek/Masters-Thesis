/**
 * @fileoverview Utility functions for anagram generation and validation
 * 
 * This module provides:
 * - Validation of anagrams against original city names
 * - Generation of randomized anagrams preserving space patterns
 * - Fixing of anagrams to match space patterns of original text
 * - Case insensitive character frequency comparisons
 * 
 * @module Components/Desktop/CreateQuiz/BlindMap/AnagramUtils
 */

/**
 * Checks if an anagram is valid compared to the original city name
 * 
 * Validates that the anagram:
 * - Has the same space pattern as the original
 * - Contains the same characters (ignoring case)
 * - Is a permutation of the original text
 * 
 * @function isValidAnagram
 * @param {string} cityName - The original city name
 * @param {string} anagram - The anagram to validate
 * @returns {boolean} True if anagram is valid, false otherwise
 */
export const isValidAnagram = (cityName, anagram) => {
  if (!cityName || !anagram) return false;
  
  // Check if anagram has the same space pattern
  const citySpaces = cityName.split('').map(char => char === ' ');
  const anagramSpaces = anagram.split('').map(char => char === ' ');
  
  if (cityName.length !== anagram.length) return false;
  
  // Check if spaces are in the same positions
  for (let i = 0; i < citySpaces.length; i++) {
    if (citySpaces[i] !== anagramSpaces[i]) return false;
  }
  
  // Remove spaces and check if the anagram is a permutation of the original
  // Use a character frequency approach with lowercase to ignore case
  const cityFreq = new Map();
  const anagramFreq = new Map();
  
  const cityChars = cityName.replace(/\s+/g, '').toLowerCase();
  const anagramChars = anagram.replace(/\s+/g, '').toLowerCase();
  
  if (cityChars.length !== anagramChars.length) return false;
  
  // Count characters in city name
  for (const char of cityChars) {
    cityFreq.set(char, (cityFreq.get(char) || 0) + 1);
  }
  
  // Count characters in anagram
  for (const char of anagramChars) {
    anagramFreq.set(char, (anagramFreq.get(char) || 0) + 1);
  }
  
  // Check if frequencies match
  if (cityFreq.size !== anagramFreq.size) return false;
  
  for (const [char, count] of cityFreq) {
    if (anagramFreq.get(char) !== count) return false;
  }
  
  return true;
};

/**
 * Generates a valid anagram from the city name, preserving spaces and converting to lowercase
 * 
 * Creates a randomized permutation of the city name's characters while:
 * - Preserving spaces in the same positions
 * - Converting all letters to lowercase
 * - Ensuring all original characters are included
 * 
 * @function generateAnagram
 * @param {string} cityName - The city name to generate an anagram from
 * @returns {string} A randomized anagram of the city name
 */
export const generateAnagram = (cityName) => {
  if (!cityName) return '';
  
  const cityNameChars = cityName.split('');
  const spacePositions = [];
  
  // Track space positions
  cityNameChars.forEach((char, index) => {
    if (char === ' ') spacePositions.push(index);
  });
  
  // Get characters without spaces and convert to lowercase
  const charsWithoutSpaces = cityName.replace(/\s+/g, '').toLowerCase().split('');
  
  // Shuffle the non-space characters
  for (let i = charsWithoutSpaces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [charsWithoutSpaces[i], charsWithoutSpaces[j]] = [charsWithoutSpaces[j], charsWithoutSpaces[i]];
  }
  
  // Reinsert spaces at the original positions
  let resultChars = [...charsWithoutSpaces];
  spacePositions.forEach(pos => {
    resultChars.splice(pos, 0, ' ');
  });
  
  return resultChars.join('');
};

/**
 * Fixes anagram spacing to match the city name's space pattern
 * 
 * Adjusts the provided anagram to ensure it has spaces in the same positions
 * as the original city name.
 * 
 * @function fixAnagram
 * @param {string} cityName - The original city name with correct spacing
 * @param {string} anagram - The anagram to fix
 * @returns {string} The anagram with corrected spacing
 */
export const fixAnagram = (cityName, anagram) => {
  if (!cityName || !anagram) return anagram;
  
  const cityNameChars = cityName.split('');
  const spacePositions = [];
  
  // Get original space positions
  cityNameChars.forEach((char, index) => {
    if (char === ' ') spacePositions.push(index);
  });
  
  // Remove all spaces from anagram
  const anagramWithoutSpaces = anagram.replace(/\s+/g, '').toLowerCase();
  
  // If the length is different after removing spaces, we can't fix it properly
  if (anagramWithoutSpaces.length !== cityName.replace(/\s+/g, '').length) {
    return anagram;
  }
  
  // Create new anagram with spaces in correct positions
  let resultChars = anagramWithoutSpaces.split('');
  spacePositions.forEach(pos => {
    if (pos < resultChars.length + spacePositions.length) {
      resultChars.splice(pos, 0, ' ');
    }
  });
  
  return resultChars.join('').toLowerCase();
};