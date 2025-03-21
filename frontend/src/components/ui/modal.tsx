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
  title: string; // ✅ Accepts title as a prop
  isOpen: boolean;
  onClose: () => void;
}

export default function BasicModal() {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div>
      <Button onClick={handleOpen}>Open Quiz</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            <h2 className="text-lg font-medium">
                What is a man?
            </h2>
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            <ul className="mt-2 space-y-2">
                <li className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                    <Button>A: A miserable pile of little secrets</Button>
                </li>
                <li className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                    <Button>B: A human bean</Button>
                </li>
                <li className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                    <Button>C: A hairless monkey</Button>
                </li>
            </ul>
          </Typography>
        </Box>
      </Modal>
    </div>
  );
}
