/**
 * Utilities for letter masking and revealing in quiz games
 */

/**
 * Creates an initial mask for a word or phrase, replacing letters with underscores
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
 * @param {Object} params - Parameters for the calculation
 * @param {number} params.timePassedPercent - Percentage of time passed (0-1)
 * @param {string} params.answer - The full answer string
 * @param {string} params.currentMask - Current mask with revealed letters
 * @param {number} params.lastRevealTime - Last time a letter was revealed 
 * @param {number} params.currentTime - Current time value (for debouncing)
 * @returns {Object} Result with shouldReveal flag and other properties
 */
export const shouldRevealLetter = ({
  timePassedPercent,
  answer,
  currentMask,
  lastRevealTime,
  currentTime
}) => {
  if (!answer) return { shouldReveal: false };
  
  // Configuration constants
  const initialDelayPercent = 0.2;  // Wait for first 20% before revealing
  const finalReservedPercent = 0.1; // Stop revealing in final 10%
  
  // Count actual letters and calculate max reveals (50%)
  const totalLetters = answer.replace(/\s/g, '').length;
  const maxReveals = Math.floor(totalLetters / 2);
  
  // Count current revealed letters
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
    const scaledProgress = Math.min(1, adjustedProgress * 1.05); // Add 5% boost to ensure full reveals
    const targetRevealCount = Math.min(maxReveals, Math.ceil(scaledProgress * maxReveals));
    
    // Determine if we should reveal a new letter
    const shouldReveal = targetRevealCount > currentRevealCount && currentTime !== lastRevealTime;
    
    return {
      shouldReveal,
      targetRevealCount,
      currentRevealCount,
      maxReveals,
      revealProgress: scaledProgress
    };
  }
  
  return { shouldReveal: false };
};

/**
 * Updates a mask with a newly revealed letter at a specific position
 * @param {string} mask - Current mask
 * @param {string} answer - Original answer
 * @param {number} position - Position to reveal
 * @returns {string} Updated mask with the letter revealed
 */
export const updateMaskWithReveal = (mask, answer, position) => {
  if (!mask || !answer || position < 0 || position >= answer.length) {
    return mask;
  }
  
  const maskArray = mask.split('');
  maskArray[position] = answer[position];
  return maskArray.join('');
};
