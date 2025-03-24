import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

interface ModalProps {
  title: string;  // ✅ Accepts title as a prop
  questions: string[]; // ✅ Accepts questions as an array of strings
  isOpen: boolean;
  onClose: () => void;
}

const QuizModal: React.FC<ModalProps> = ({ title, questions, isOpen, onClose }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          <h2 className="text-lg font-medium">{title}</h2>
        </Typography>
        <Typography id="modal-modal-description" sx={{ mt: 2 }}>
          <ul className="mt-2 space-y-2">
            {questions.map((question, index) => (
              <li key={index} className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                <Button>{question}</Button>
              </li>
            ))}
          </ul>
        </Typography>
      </Box>
    </Modal>
  );
};

export default QuizModal;
