"use client";

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { getLocalDateString } from '@/utils/dateHelpers';

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

      // Get today's date in EST timezone YYYY-MM-DD format
      const today = getLocalDateString();
      
      // Also check for yesterday's date in case of timezone issues with existing entries
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEST = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(yesterday);
      const yesterdayStr = `${yesterdayEST.find(part => part.type === 'year')?.value}-${yesterdayEST.find(part => part.type === 'month')?.value}-${yesterdayEST.find(part => part.type === 'day')?.value}`;

      // Check if user has submitted a reflection for today or yesterday (accounting for timezone differences)
      const todayReflection = journalEntries.find(entry => {
        const dateMatch = entry.entry_date === today || entry.entry_date === yesterdayStr;
        const elementMatch = entry.element === profile.element;
        const hasContent = (entry.reflection_response && entry.reflection_response.trim() !== '') || 
                          (entry.soul_star && entry.soul_star.trim() !== '') ||
                          (entry.intention_response && entry.intention_response.trim() !== '');
        
        // Debug logging to help track down the issue
        console.log('useDailyReflectionStatus - checking entry:', {
          entryDate: entry.entry_date,
          today,
          yesterdayStr,
          dateMatch,
          entryElement: entry.element,
          profileElement: profile.element,
          elementMatch,
          reflection_response: entry.reflection_response,
          soul_star: entry.soul_star,
          intention_response: entry.intention_response,
          hasContent,
          shouldMatch: dateMatch && elementMatch && hasContent
        });
        
        return dateMatch && elementMatch && hasContent;
      });

      // If no reflection found for today, user has pending reflection
      console.log('useDailyReflectionStatus - final result:', {
        todayReflection: !!todayReflection,
        hasPendingReflection: !todayReflection
      });
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