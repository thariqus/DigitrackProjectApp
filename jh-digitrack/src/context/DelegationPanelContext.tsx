import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DelegationPanelContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DelegationPanelContext = createContext<DelegationPanelContextType | undefined>(undefined);

export function DelegationPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DelegationPanelContext.Provider value={{ open, setOpen }}>
      {children}
    </DelegationPanelContext.Provider>
  );
}

export function useDelegationPanel() {
  const context = useContext(DelegationPanelContext);
  if (context === undefined) {
    throw new Error('useDelegationPanel must be used within DelegationPanelProvider');
  }
  return context;
}

