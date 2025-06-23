import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ConfirmationProps } from "@/types/tasks";
import { buttonVariants } from "@/components/ui/button";

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  message,
}: ConfirmationProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{message}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          className={cn(
            buttonVariants({ variant: "default" }),
            "hover:text-white"
          )}
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          className={cn(buttonVariants({ variant: "outline" }), "text-black")}
          onClick={onConfirm}
        >
          Confirm
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmationDialog;
