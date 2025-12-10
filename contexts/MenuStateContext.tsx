'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface MenuStateContextType {
  isMenuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
}

const MenuStateContext = createContext<MenuStateContextType | null>(null);

export function MenuStateProvider({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const setMenuOpen = useCallback((open: boolean) => {
    setIsMenuOpen(open);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const value: MenuStateContextType = {
    isMenuOpen,
    setMenuOpen,
    toggleMenu,
  };

  return (
    <MenuStateContext.Provider value={value}>
      {children}
    </MenuStateContext.Provider>
  );
}

export function useMenuState() {
  const context = useContext(MenuStateContext);
  if (!context) {
    throw new Error('useMenuState must be used within a MenuStateProvider');
  }
  return context;
}