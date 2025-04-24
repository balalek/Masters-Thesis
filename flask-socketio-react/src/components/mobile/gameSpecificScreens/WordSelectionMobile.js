import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { getSocket } from '../../../utils/socket';

const WordSelectionMobile = ({ words, playerName, onWordSelected, isLate }) => {
  const [selectedWord, setSelectedWord] = useState(null);

  const handleWordSelect = (word) => {
    setSelectedWord(word);
  };

  const handleConfirmSelection = () => {
    if (!selectedWord) return;

    // Only notify parent component that selection is complete
    // The parent will handle the socket emission with the late flag
    if (onWordSelected) {
      onWordSelected(selectedWord);
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      p: 2
    }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        Vyber slovo, které budeš kreslit:
      </Typography>

      {isLate && (
        <Typography 
          color="error" 
          sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}
        >
          Vybíráš pozdě! Dostaneš méně bodů za správné odpovědi.
        </Typography>
      )}

      <Stack spacing={2} sx={{ width: '100%', mb: 4 }}>
        {words.map((word, index) => (
          <Button
            key={index}
            variant={selectedWord === word ? "contained" : "outlined"}
            color="primary"
            onClick={() => handleWordSelect(word)}
            size="large"
            fullWidth
            sx={{ py: 1.5, fontSize: '1.2rem' }}
          >
            {word}
          </Button>
        ))}
      </Stack>

      <Button
        variant="contained"
        color="success"
        size="large"
        disabled={!selectedWord}
        onClick={handleConfirmSelection}
        sx={{ 
          minWidth: 200, 
          py: 1.5, 
          fontSize: '1.2rem',
          mt: 2 
        }}
      >
        Potvrdit výběr
      </Button>
    </Box>
  );
};

export default WordSelectionMobile;
