"use client";

import SharedModal from "@/components/SharedModal";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  ariaLabel?: string;
  size?: "small" | "medium" | "large";
};

export default function SharedPopup({ 
  open, 
  onClose, 
  title, 
  children, 
  ariaLabel,
  size = "medium" 
}: Props) {
  return (
    <SharedModal 
      open={open} 
      onClose={onClose} 
      title={title}
      ariaLabel={ariaLabel}
    >
      <div className={`popup-content ${size}`}>
        {children}
      </div>
      <style jsx>{`
        .popup-content.small {
          max-width: 300px;
        }
        .popup-content.medium {
          max-width: 500px;
        }
        .popup-content.large {
          max-width: 800px;
        }
        .popup-content {
          width: 100%;
        }
      `}</style>
    </SharedModal>
  );
}