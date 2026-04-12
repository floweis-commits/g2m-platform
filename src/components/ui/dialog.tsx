"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface DialogContextType {
  isOpen: boolean;
  onClose: () => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(
  undefined,
);

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogContent");
  }
  return context;
};

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Dialog({ isOpen, onClose, children }: DialogProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <DialogContext.Provider value={{ isOpen, onClose }}>
      {isOpen && <>{children}</>}
    </DialogContext.Provider>
  );
}

function DialogOverlay() {
  const { onClose } = useDialog();

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
    />
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function DialogContent({ children, className }: DialogContentProps) {
  return (
    <>
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn("border-b border-slate-200 px-6 py-4", className)}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-900", className)}>
      {children}
    </h2>
  );
}

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

function DialogBody({ children, className }: DialogBodyProps) {
  return (
    <div className={cn("space-y-4 px-6 py-4", className)}>{children}</div>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn("border-t border-slate-200 flex gap-3 px-6 py-4", className)}
    >
      {children}
    </div>
  );
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useDialog,
};
