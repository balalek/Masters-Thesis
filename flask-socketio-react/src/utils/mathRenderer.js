/**
 * Utility functions for rendering mathematical equations
 */

/**
 * Formats a mathematical equation for display
 * - Converts sqrt(x) to √x
 * - Converts x^y to x^y formatted as superscript
 * - Converts factorial (x!) to proper display
 * 
 * @param {string} equation - The equation to format
 * @returns {JSX.Element} - The formatted equation
 */
export const renderMathEquation = (equation) => {
  if (!equation) return '';
  
  // Replace basic math operations
  let formattedEquation = equation
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\+/g, ' + ')
    .replace(/\-/g, ' - ');
  
  // Replace sqrt(x) with √x
  formattedEquation = formattedEquation.replace(/sqrt\(([^)]+)\)/g, '√$1');
  
  // Handle exponents (x^y)
  const parts = [];
  let currentIndex = 0;
  
  // Find all instances of ^ and format them as superscripts
  const exponentRegex = /(\d+|\))\^(\d+|\([^)]+\))/g;
  let match;
  
  while ((match = exponentRegex.exec(formattedEquation)) !== null) {
    // Add text before the match
    parts.push(formattedEquation.substring(currentIndex, match.index));
    
    // Add the base
    parts.push(match[1]);
    
    // Add the exponent as a superscript
    parts.push(<sup key={match.index}>{match[2]}</sup>);
    
    // Update the current index
    currentIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  parts.push(formattedEquation.substring(currentIndex));
  
  // Handle word problems by keeping them as is
  if (parts.length === 1 && !exponentRegex.test(formattedEquation) && !formattedEquation.includes('sqrt')) {
    return formattedEquation;
  }
  
  return <>{parts}</>;
};
