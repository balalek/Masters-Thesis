/**
 * @fileoverview Utilities for progressive letter revealing in open answer and drawing quizzes
 * 
 * This module provides:
 * - Word masking with underscores for hidden letters
 * - Progressive letter reveal calculations based on time
 * - Strategic letter selection algorithms for hints
 * - Mask updating with newly revealed letters
 * @author Bc. Martin Baláž with AI
 * @module Utils/LetterReveal
 */

/**
 * Creates an initial mask for a word or phrase, replacing letters with underscores
 * 
 * Preserves spaces and special characters while masking all letters that
 * players need to guess.
 * 
 * @function createInitialMask
 * @param {string} answer - The correct answer to mask
 * @returns {string} A string with letters replaced by underscores and spaces preserved
 */
export const createInitialMask = (answer) => {
  if (!answer) return '';
  
  return answer.split('').map(char => 
    char === ' ' ? ' ' : '_'
  ).join('');
};

/**
 * Calculates if a letter should be revealed at the current time
 * 
 * Uses a sophisticated algorithm to determine reveal timing:
 * - Delays initial reveals until 20% of time has passed
 * - Stops reveals in the final 10% of time
 * - Limits total reveals to 50% of the answer's letters
 * - Scales reveal rate to ensure smooth progression
 * 
 * @function shouldRevealLetter
 * @param {Object} params - Parameters for the calculation
 * @param {number} params.timePassedPercent - Percentage of time passed (0-1)
 * @param {string} params.answer - The full answer string
 * @param {string} params.currentMask - Current mask with revealed letters
 * @param {number} params.lastRevealTime - Last time a letter was revealed 
 * @param {number} params.currentTime - Current time value (for debouncing)
 * @returns {boolean} Result with flag, if a letter should be revealed
 */
export const shouldRevealLetter = ({
  timePassedPercent,
  answer,
  currentMask,
  lastRevealTime,
  currentTime
}) => {
  if (!answer) return false;
  
  // Configuration constants
  const initialDelayPercent = 0.2;  // Wait for first 20% before revealing
  const finalReservedPercent = 0.1; // Stop revealing in final 10%
  
  // Count actual letters and calculate max reveals (50%)
  const totalLetters = answer.replace(/\s/g, '').length;
  const maxReveals = Math.floor(totalLetters / 2);
  
  // Count current revealed letters (excluding underscores and whitespace (\s)) 
  // -> /g means don't stop at first match
  const currentRevealCount = currentMask
    ? (currentMask.match(/[^_\s]/g) || []).length
    : 0;
  
  // Check if reveal time constraints are met
  const isInRevealTimeWindow = 
    timePassedPercent > initialDelayPercent && 
    timePassedPercent < (1 - finalReservedPercent);
  
  // Check if max reveals constraint is met
  const isUnderMaxReveals = currentRevealCount < maxReveals;
  
  // Calculate the target number of letters that should be revealed by now
  if (isInRevealTimeWindow && isUnderMaxReveals) {
    const availableRevealTime = 1 - initialDelayPercent - finalReservedPercent;
    const adjustedProgress = (timePassedPercent - initialDelayPercent) / availableRevealTime;
    const scaledProgress = Math.min(1, adjustedProgress * 1.05); // Added 5% boost to ensure full reveals
    const targetRevealCount = Math.min(maxReveals, Math.ceil(scaledProgress * maxReveals));
    
    // Determine if we should reveal a new letter
    return targetRevealCount > currentRevealCount && currentTime !== lastRevealTime;
  }
  
  return false;
};