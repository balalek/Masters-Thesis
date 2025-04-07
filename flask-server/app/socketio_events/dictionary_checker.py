"""
Dictionary checker class for word validation in word chain game
"""
import os

class DictionaryChecker:
    def __init__(self, dic_file_path):
        """Initialize dictionary checker with path to .dic file"""
        self.words = set()
        self.load_dictionary(dic_file_path)
        
    def load_dictionary(self, dic_file_path):
        """Load words from the dictionary file into memory"""
        if not os.path.exists(dic_file_path):
            print(f"Dictionary file not found: {dic_file_path}")
            return False
            
        try:
            with open(dic_file_path, 'r', encoding='utf-8') as f:
                # Process the file
                for line in f:
                    # Strip and add words (ignoring any flags after '/')
                    word = line.strip().split('/')[0].lower()
                    if word:
                        self.words.add(word)
                        
            print(f"Loaded {len(self.words)} words from dictionary")
            return True
        except Exception as e:
            print(f"Error loading dictionary: {str(e)}")
            return False
            
    def word_exists(self, word):
        """Check if a word exists in the dictionary"""
        return word.lower() in self.words
