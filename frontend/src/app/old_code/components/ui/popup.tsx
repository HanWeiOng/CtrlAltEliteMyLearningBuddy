// // components/ui/popup.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { X } from "lucide-react";

// interface PopupProps {
//   isOpen: boolean;
//   onClose: () => void;
//   title: string;
//   message: string;
//   confirmText?: string;
//   onConfirm?: () => void;
//   cancelText?: string;
// }

// export default function Popup({
//   isOpen,
//   onClose,
//   title,
//   message,
//   confirmText = "OK",
//   onConfirm,
//   cancelText,
// }: PopupProps) {
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     if (isOpen) {
//       setIsVisible(true);
//     } else {
//       const timer = setTimeout(() => {
//         setIsVisible(false);
//       }, 300);
//       return () => clearTimeout(timer);
//     }
//   }, [isOpen]);

//   const handleConfirm = () => {
//     if (onConfirm) onConfirm();
//     onClose();
//   };

//   if (!isVisible) return null;

//   return (
//     <div
//       className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
//         isOpen ? "opacity-100" : "opacity-0"
//       }`}
//     >
//       <div 
//         className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
//         onClick={onClose}
//       ></div>
//       <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-transform duration-300">
//         <button
//           onClick={onClose}
//           className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
//         >
//           <X size={20} />
//         </button>
//         <h3 className="text-xl font-semibold mb-2">{title}</h3>
//         <p className="text-gray-600 mb-6">{message}</p>
//         <div className="flex justify-end space-x-3">
//           {cancelText && (
//             <button
//               onClick={onClose}
//               className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
//             >
//               {cancelText}
//             </button>
//           )}
//           <button
//             onClick={handleConfirm}
//             className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
//           >
//             {confirmText}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
