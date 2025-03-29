import React, { useState } from "react";
import QuizModal from "./quiz-modal";  // Import the component
import {Button} from './button'

const ParentComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => setIsModalOpen(false);

  return (
    <div>
      <Button onClick={handleOpen}>Open Quiz</Button>
      <QuizModal
        title="What is a man?"
        questions={[
          "A: A miserable pile of little secrets",
          "B: A human bean",
          "C: A hairless monkey",
        ]}
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </div>
  );
};

export default ParentComponent;
