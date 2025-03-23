/**
 * Checks if an anagram is valid compared to the original city name
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
  
  // Count characters in city name (in lowercase)
  for (const char of cityChars) {
    cityFreq.set(char, (cityFreq.get(char) || 0) + 1);
  }
  
  // Count characters in anagram (in lowercase)
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
