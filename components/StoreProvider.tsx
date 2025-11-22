"use client";

import React from 'react';
import StoreModal, { useStoreModal } from './StoreModal';

export default function StoreProvider() {
  const { currentItem, isOpen, closeStore } = useStoreModal();

  return (
    <StoreModal
      item={currentItem}
      isOpen={isOpen}
      onClose={closeStore}
      onPurchaseSuccess={(item) => {
        console.log('Purchase successful:', item);
        // Could emit an event here for other components to react to
        // Or trigger a toast notification
      }}
    />
  );
}