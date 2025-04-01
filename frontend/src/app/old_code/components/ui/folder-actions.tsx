// "use client"

// import * as React from "react"
// import { MoreHorizontal, Share2, Download, Trash2 } from "lucide-react"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Button } from "@/components/ui/button"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog"

// interface FolderActionsProps {
//   folderId: number;
//   folderName: string;
//   onDelete: (folderId: number) => void;
//   onShare: (folderId: number) => void;
//   onDownload: (folderId: number) => void;
// }

// export function FolderActions({
//   folderId,
//   folderName,
//   onDelete,
//   onShare,
//   onDownload,
// }: FolderActionsProps) {
//   const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
//   const [isDeleting, setIsDeleting] = React.useState(false)

//   const handleDelete = async () => {
//     try {
//       setIsDeleting(true)
//       await onDelete(folderId)
//       setShowDeleteDialog(false)
//     } catch (error) {
//       console.error('Error deleting folder:', error)
//     } finally {
//       setIsDeleting(false)
//     }
//   }

//   return (
//     <>
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//         <Button
//             variant="ghost"
//             size="icon"
//             className="h-8 w-8 p-0 rounded-full hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 transition-all duration-200"
//           >
//             <span className="sr-only">Open menu</span>
//             <MoreHorizontal className="h-4 w-4 text-[#7C3AED] dark:text-[#7C3AED]" />
//           </Button>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end" className="w-48 border-[#7C3AED] dark:border-[#7C3AED]">
//           <DropdownMenuItem
//             onClick={() => onShare(folderId)}
//             className="cursor-pointer text-[#7C3AED] dark:text-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 transition-all duration-200"
//           >
//             <Share2 className="mr-2 h-4 w-4 text-[#7C3AED] dark:text-[#7C3AED]" />
//             Share Quiz
//           </DropdownMenuItem>
//           <DropdownMenuItem
//             onClick={() => onDownload(folderId)}
//             className="cursor-pointer text-[#7C3AED] dark:text-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 transition-all duration-200"
//           >
//             <Download className="mr-2 h-4 w-4 text-[#7C3AED] dark:text-[#7C3AED]" />
//             Download Quiz
//           </DropdownMenuItem>
//           <DropdownMenuSeparator className="bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20" />
//           <DropdownMenuItem
//             onClick={() => setShowDeleteDialog(true)}
//             className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
//           >
//             <Trash2 className="mr-2 h-4 w-4" />
//             Delete Quiz
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>

//       <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <DialogContent className="bg-white dark:bg-gray-900 border-[#7C3AED] dark:border-[#7C3AED] rounded-xl">
//           <DialogHeader>
//             <DialogTitle className="text-gray-900 dark:text-white">Delete Quiz</DialogTitle>
//             <DialogDescription className="text-gray-600 dark:text-gray-300">
//               Are you sure you want to delete "{folderName}"? This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setShowDeleteDialog(false)}
//               className="rounded-lg border-[#7C3AED] dark:border-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#7C3AED] transition-all duration-200"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleDelete}
//               disabled={isDeleting}
//               className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
//             >
//               {isDeleting ? "Deleting..." : "Delete"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   )
// }