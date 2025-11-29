"use client";

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';

export function useDailyReflectionStatus() {
  const { user, journalEntries, profile } = useProfile();
  const [hasPendingReflection, setHasPendingReflection] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkReflectionStatus = () => {
      setLoading(true);
      
      // If no user is logged in, no pending reflection
      if (!user || !profile) {
        setHasPendingReflection(false);
        setLoading(false);
        return;
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Check if user has submitted a reflection for today
      const todayReflection = journalEntries.find(entry => 
        entry.entry_date === today && 
        entry.element === profile.element &&
        (entry.reflection_response || entry.soul_star) // Has written something substantial
      );

      // If no reflection found for today, user has pending reflection
      setHasPendingReflection(!todayReflection);
      setLoading(false);
    };

    checkReflectionStatus();
  }, [user, journalEntries, profile]);

  // Function to manually mark reflection as completed
  const markReflectionComplete = () => {
    setHasPendingReflection(false);
  };

  return {
    hasPendingReflection,
    loading,
    setHasPendingReflection,
    markReflectionComplete,
  };
}