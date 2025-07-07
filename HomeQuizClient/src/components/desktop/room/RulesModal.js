/**
 * @fileoverview Rules Modal component for displaying game rules
 * 
 * This component provides:
 * - Modal dialog with game rules
 * - Closeable interface
 * - Responsive layout for rules content
 * @author Bc. Martin Baláž
 * @module Components/Desktop/Room/RulesModal
 */
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

/**
 * Rules Modal component displaying game instructions
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onClose - Function to call when closing the modal
 * @returns {JSX.Element} The rendered rules modal component
 */
const RulesModal = ({ open, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: { 
          sx: { 
            p: 2,
            minHeight: '60vh'
          }
        }
      }}
    >      
    <DialogTitle sx={{ textAlign: 'center', fontSize: '1.8rem', borderBottom: '1px solid #ddd', pb: 2, mb: 2 }}>
        Pravidla Hry
      </DialogTitle>
        <DialogContent sx={{ overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            ABCD, Pravda/Lež
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Lze odpovědět pouze jednou za celý tým. Spolupracujte spolu!
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč má jednu možnost na odpověď. Odpovídejte rychle!
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Otevřená odpověď
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč může odpovídat neomezeně, správná odpověď se započítává celému týmu.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč může odpovídat neomezeně. Odpovídejte rychle!
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Slepá mapa
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Tým, který vyřeší přesmyčku, bude mít přednost v hádání místa na mapě.
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Všichni členové týmu mohou určit umístění, ale pouze kapitán má finální odpověď. Spolupracujte!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Pokud tým neuhodne místo, dostane šanci na hádání druhý tým.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč může odpovídat neomezeně na přesmyčku. Odpovídejte rychle!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč má jednu možnost určit umístění na mapě. 
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Kreslení
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Vždy hraje jenom jeden tým. Jeden člen kreslí a ostatní hádají.
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Jakmile někdo uhádne, kolo je úspěšně ukončeno a hraje druhý tým.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč bude jednout kreslit a ostatní hádat. Snažte se kreslit co nejlépe!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Hádají hráči mohou odpovídat neomezeně. Odpovídejte rychle! 
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Hádání čísla
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Tým, který začíná, má možnost tipnout číslo. Kapitán týmu má finální odpověď.
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Druhý tým poté hlasuje, zda je správná odpověď menší nebo větší.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč má jednu možnost na odpověď. Snažte se tipnout co nejblíže správné odpovědi!
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Řetěz slov
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Všichni hráči se střídají při vytváření slovního řetězu, zatímco na pozadí tiká bomba!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Tým, u kterého vybouchne bomba, prohrává.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Všichni hráči se střídají při vytváření slovního řetězu.
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každému hráči utíká čas, když je na řadě. Snažte se přežít co nejdéle!
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
            Matematický kvíz
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Týmový režim:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč má jednu možnost na odpověď. Snažte se počítat co nejrychleji!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Pokud hráč odpoví správně, celý tým postupuje do dalšího kola.
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Pokud hráč odpoví špatně, je eliminován po zbytek matematického kvízu, ale spoluhráči pokračují.
          </Typography>
          <Typography component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            Všichni proti všem:
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Každý hráč má jednu možnost na odpověď. Snažte se počítat co nejrychleji!
          </Typography>
          <Typography component="div" sx={{ mb: 1, ml: 2 }}>
            • Pokud hráč odpoví špatně, je eliminován po zbytek matematického kvízu.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Zavřít
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RulesModal;
