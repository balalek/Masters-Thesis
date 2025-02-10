import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/StarBorderOutlined';
import SquareIcon from '@mui/icons-material/SquareOutlined';
import PentagonIcon from '@mui/icons-material/PentagonOutlined';
import CircleIcon from '@mui/icons-material/CircleOutlined';

const ABCDQuiz = ({ question, answersCount }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      justifyContent: 'space-between', 
      padding: 2 
    }}>
      {/* Center content grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        px: 4
      }}>
        {/* Timer bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            20
          </Typography>
        </Box>

        {/* Question */}
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 500
          }}
        >
          {question?.question}
        </Typography>

        {/* Answers count bubble */}
        <Box sx={{ 
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '2px solid #3B82F6'
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
            {answersCount}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#3B82F6', mt:-1.5 }}>
            odpovědí
          </Typography>
        </Box>
      </Box>

      {/* Answer buttons */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 2 
      }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#14A64A', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<StarIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[0]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#186CF6', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<SquareIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[1]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EF4444', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<PentagonIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[2]}
          </Typography>
        </Button>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#EAB308', color: 'white', flex: '1 1 45%', height: '150px', fontSize: '2.5em', justifyContent: 'flex-start', paddingLeft: 2, textTransform: 'none' }}
          startIcon={<CircleIcon sx={{ fontSize: '1.5em !important', color: 'white' }} />}
        >
          <Typography sx={{ fontSize: '0.92em', flexGrow: 1, textAlign: 'left', padding: 1, lineHeight: 1.2 }}>
            {question?.options[3]}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default ABCDQuiz;
