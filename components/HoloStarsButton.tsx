"use client";
import React, { useRef, useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { awardHeartCoins } from "@/utils/heartcoins";
import { fetchTodaysJournalEntry, upsertJournalEntry, JournalEntry } from "@/utils/journal";
import SharedButton from "@/components/SharedButton";

export default function HoloStarsButton({
  onClick,
  label = "JOURNAL",
  isActive = false,
  autoOpen = false,
  onJournalCompleted,
  onBeamColorChange,
  onJournalEntryChange,
  onOpenBlueDisplay,
}: {
  onClick?: () => void;
  label?: string;
  isActive?: boolean;
  autoOpen?: boolean;
  onJournalCompleted?: () => void;
  onBeamColorChange?: (color: string) => void;
  onJournalEntryChange?: (entry: JournalEntry | null) => void;
  onOpenBlueDisplay?: () => void;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const [questionResponse, setQuestionResponse] = useState("");
  const [showSoulSky, setShowSoulSky] = useState(false);
  const [showSoulStarText, setShowSoulStarText] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [isJournalCompleted, setIsJournalCompleted] = useState(false);
  const [showJournalView, setShowJournalView] = useState(false);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [intention, setIntention] = useState("");
  const [reflection, setReflection] = useState("");
  const [soulStar, setSoulStar] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  // Check if journal was completed today
  const checkJournalCompletion = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return false;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check for existing HeartCoin transaction for journal completion today
      const { data: transactions, error } = await supabaseBrowser
        .from('heartcoin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('reason', 'Completed journal reflection')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) {
        console.error('Error checking journal completion:', error);
        return false;
      }

      return transactions && transactions.length > 0;
    } catch (error) {
      console.error('Error checking journal completion:', error);
      return false;
    }
  };

  // Load completion status and journal entry on mount
  useEffect(() => {
    checkJournalCompletion().then(setIsJournalCompleted);
    loadTodaysJournalEntry();
  }, []);

  // Load today's journal entry
  const loadTodaysJournalEntry = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      const entry = await fetchTodaysJournalEntry(supabaseBrowser, user.id);
      setJournalEntry(entry);
      onJournalEntryChange?.(entry);
      
      if (entry) {
        setIntention(entry.intention || "");
        setReflection(entry.reflection || "");
        setSoulStar(entry.soul_star || "");
      }
    } catch (error) {
      console.error('Error loading journal entry:', error);
    }
  };

  // Save journal entry to Supabase
  const saveJournalEntry = async () => {
    // Validation
    if (!intention.trim() && !reflection.trim() && !soulStar.trim()) {
      setValidationMessage("Write something before saving your star for today");
      setTimeout(() => setValidationMessage(""), 3000);
      return;
    }

    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) {
        setValidationMessage("User not found");
        return;
      }

      const savedEntry = await upsertJournalEntry(supabaseBrowser, user.id, {
        intention: intention.trim(),
        reflection: reflection.trim(),
        soul_star: soulStar.trim()
      });
      
      setJournalEntry(savedEntry);
      onJournalEntryChange?.(savedEntry);
      setSaveMessage("Your Soul Star for today is saved");
      
      // Play success sound
      try { sfx.play('click', 0.8); } catch {}
      
      // Clear save message after 3 seconds
      setTimeout(() => setSaveMessage(""), 3000);
      
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      setValidationMessage("Failed to save entry. Please try again.");
      setTimeout(() => setValidationMessage(""), 3000);
    }
  };

  // Handle journal button click
  const handleJournalClick = () => {
    setShowJournalView(true);
  };

  // Close journal view
  const closeJournalView = () => {
    setShowJournalView(false);
    setSaveMessage("");
    setValidationMessage("");
    // Also close the entire modal and open blue display
    handleCloseModal();
  };

  // Enhanced close handler that opens blue display
  const handleCloseModal = () => {
    setShowModal(false);
    if (typeof onClick === "function") { 
      try { onClick(); } catch {} 
    }
    // Automatically open blue display after closing stars modal
    try { 
      onOpenBlueDisplay?.(); 
    } catch {}
  };

  // Auto-open modal when autoOpen is true
  useEffect(() => {
    if (autoOpen) {
      handleActivate();
    }
  }, [autoOpen]);

  function handleActivate() {
    try { 
      const a = sfxRef.current; 
      if (a) { 
        a.currentTime = 0; 
        a.volume = 0.95; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    // Change beam color to yellow when Star button is clicked
    try { onBeamColorChange?.('yellow'); } catch {}
    
    // Start black sky warp transition
    setShowModal(true);
    
    if (typeof onClick === "function") { 
      try { onClick(); } catch {} 
    }
  }

  async function handleSendResponse() {
    if (!questionResponse.trim() || isJournalCompleted) return;
    
    try {
      // Award HeartCoin for completing journal reflection
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (user) {
        await awardHeartCoins(
          supabaseBrowser,
          user.id,
          1,
          'Completed journal reflection',
          {
            response: questionResponse.trim(),
            date: new Date().toISOString().split('T')[0]
          }
        );
        
        // Mark journal as completed
        setIsJournalCompleted(true);
        
        // Notify parent component
        onJournalCompleted?.();
      }
    } catch (error) {
      console.error('Failed to award HeartCoins for journal completion:', error);
      // Continue with animation even if HeartCoin awarding fails
    }
    
    setShowSoulSky(true);
    setShowStarAnimation(true);
    setQuestionResponse("");
    
    // Show soul star text in button after a delay
    setTimeout(() => {
      setShowSoulStarText(true);
    }, 2000);
    
    // Hide modal after animation
    setTimeout(() => {
      setShowStarAnimation(false);
      setShowSoulSky(false);
      handleCloseModal();
    }, 5000);
  }

  return (
    <>
      <SharedButton
        variant="stars"
        aria-label={label}
        onClick={handleActivate}
        onHoverSound={() => sfx.play('hover', 0.35)}
        className={`custom-stars-style ${showSoulStarText ? 'soul-star-text' : ''}`}
      >
        {showSoulStarText ? (
          "Your soul star shines above."
        ) : (
          <img src="/elements/stars.png" alt="Stars" className="star-image" />
        )}
      </SharedButton>
      
      <style jsx>{`
        .custom-stars-style {
          width: 90px;
          height: 50px;
          border-radius: 12px;
          font-size: 32px;
          color: inherit !important;
          background: transparent !important;
          border: none;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 !important;
          text-shadow: none;
          box-shadow: none;
          overflow: hidden;
        }
        
        .star-image {
          width: 90%;
          height: 90%;
          object-fit: contain;
          border-radius: 8px;
          filter: 
            drop-shadow(0 0 12px #FFFF00) 
            drop-shadow(0 0 24px #FFFF00) 
            drop-shadow(0 0 36px #FFD700) 
            drop-shadow(0 0 48px #FFFF00) 
            brightness(1.3) 
            saturate(1.5) !important;
          opacity: 1 !important;
          border: 2px solid #FFFF00;
          box-sizing: border-box;
          background: transparent !important;
          color: initial !important;
          transition: filter 0.3s ease;
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.8),
            0 0 40px rgba(255, 255, 0, 0.6),
            0 0 60px rgba(255, 255, 0, 0.4);
        }
        
        .soul-star-text {
          width: auto;
          min-width: 200px;
          height: auto;
          border-radius: 25px;
          font-size: 0.8rem;
          padding: 0.75rem 1.5rem;
          white-space: nowrap;
          text-align: center;
          animation: soulStarGlow 2s ease-in-out infinite alternate;
        }
        
        @media (max-width: 768px) {
          .custom-stars-style {
            width: 70px;
            height: 70px;
            font-size: 28px;
          }
          .soul-star-text {
            min-width: 150px;
            font-size: 0.7rem;
            padding: 0.5rem 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .custom-stars-style {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
          .soul-star-text {
            min-width: 120px;
            font-size: 0.6rem;
            padding: 0.4rem 0.8rem;
          }
        }
        
        .custom-stars-style:hover {
          transform: scale(1.1);
          text-shadow: none;
          box-shadow: none;
        }
        
        .custom-stars-style:hover .star-image {
          filter: 
            drop-shadow(0 0 20px #FFFF00) 
            drop-shadow(0 0 40px #FFFF00) 
            drop-shadow(0 0 60px #FFD700) 
            drop-shadow(0 0 80px #FFFF00) 
            brightness(1.5) 
            saturate(2) !important;
          border-color: #FFD700;
          border-width: 4px;
          box-shadow: 
            0 0 30px rgba(255, 255, 0, 1),
            0 0 60px rgba(255, 255, 0, 0.8),
            0 0 90px rgba(255, 255, 0, 0.6),
            0 0 120px rgba(255, 255, 0, 0.4);
        }
        
        .custom-stars-style:active {
          transform: scale(0.95);
        }

        .journal-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          pointer-events: none;
        }
        
        .journal-popup {
          position: absolute;
          top: 4rem;
          left: 1rem;
          width: 90vw;
          max-width: 400px;
          max-height: 85vh;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFFF00;
          border-radius: 1rem;
          box-shadow: 
            0 0 30px rgba(255, 255, 0, 0.4),
            0 0 50px rgba(255, 255, 0, 0.2);
          pointer-events: auto;
          animation: popupSlideIn 0.3s ease-out;
          backdrop-filter: blur(10px);
        }
        
        @keyframes popupSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-20px) translateY(-10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
          }
        }
        
        .quick-reflection-panel {
          padding: 1.5rem;
        }
        
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 0, 0.3);
        }
        
        .popup-header h3 {
          color: #FFFF00;
          font-size: 1.2rem;
          font-weight: bold;
          margin: 0;
          text-shadow: 0 0 10px #FFFF00;
        }
        
        .popup-close {
          background: transparent;
          border: none;
          color: #FFFF00;
          font-size: 1.5rem;
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        
        .popup-close:hover {
          transform: scale(1.1);
          text-shadow: 0 0 15px #FFFF00;
        }
        
        .popup-date {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        
        .quick-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        
        .form-field label {
          color: #FFFF00;
          font-size: 0.9rem;
          font-weight: 500;
          text-shadow: 0 0 5px #FFFF00;
        }
        
        .popup-input,
        .popup-textarea {
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 255, 0, 0.6);
          border-radius: 0.5rem;
          color: #FFFFFF;
          padding: 0.5rem;
          font-size: 0.85rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s ease;
        }
        
        .popup-input::placeholder,
        .popup-textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .popup-input:focus,
        .popup-textarea:focus {
          outline: none;
          border-color: #FFFF00;
          box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
        }
        
        .popup-textarea {
          min-height: 60px;
        }
        
        .popup-message {
          padding: 0.5rem;
          border-radius: 0.3rem;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .popup-message.error {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid #FF6B6B;
          color: #FF6B6B;
        }
        
        .popup-message.success {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #51CF66;
          color: #51CF66;
          text-shadow: 0 0 5px #51CF66;
        }
        
        .popup-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        
        .save-entry-btn,
        .cast-star-btn,
        .cast-completed {
          flex: 1;
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .save-entry-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #000;
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        }
        
        .save-entry-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        
        .cast-star-btn {
          background: rgba(255, 255, 0, 0.1);
          color: #FFFF00;
          border: 1px solid #FFFF00;
          text-shadow: 0 0 8px #FFFF00;
        }
        
        .cast-star-btn:hover:not(:disabled) {
          background: rgba(255, 255, 0, 0.2);
          transform: scale(1.02);
          box-shadow: 0 0 15px rgba(255, 255, 0, 0.4);
        }
        
        .cast-star-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cast-completed {
          background: rgba(0, 255, 0, 0.1);
          color: #00FF00;
          border: 1px solid #00FF00;
          text-shadow: 0 0 8px #00FF00;
          cursor: default;
        }
        
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .journal-popup {
            top: 3.5rem;
            left: 0.5rem;
            right: 0.5rem;
            width: auto;
            max-width: none;
            max-height: 80vh;
          }
          
          .quick-reflection-panel {
            padding: 1rem;
          }
          
          .popup-header h3 {
            font-size: 1rem;
          }
          
          .popup-close {
            width: 25px;
            height: 25px;
            font-size: 1.3rem;
          }
          
          .form-field label {
            font-size: 0.8rem;
          }
          
          .popup-input,
          .popup-textarea {
            font-size: 0.8rem;
            padding: 0.4rem;
          }
          
          .popup-textarea {
            min-height: 50px;
          }
          
          .popup-actions {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .save-entry-btn,
          .cast-star-btn,
          .cast-completed {
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .journal-popup {
            top: 3rem;
            left: 0.25rem;
            right: 0.25rem;
            max-height: 75vh;
          }
          
          .quick-reflection-panel {
            padding: 0.75rem;
          }
          
          .quick-form {
            gap: 0.75rem;
          }
          
          .popup-header h3 {
            font-size: 0.9rem;
          }
          
          .popup-textarea {
            min-height: 40px;
          }
        }
        
        .warp-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          animation: warpToBlack 1s ease-out forwards;
        }
        
        .modal-container {
          position: relative;
          z-index: 10000;
          max-width: 90vw;
          width: 100%;
          max-width: 500px;
          padding: 2rem;
        }
        
        .soul-sky-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .soul-sky-header h1 {
          font-size: clamp(2rem, 8vw, 4rem);
          color: #FFFF00;
          text-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF00;
          font-weight: bold;
          letter-spacing: 0.2em;
          margin: 0;
          animation: soulSkyGlow 2s ease-in-out infinite alternate;
        }
        
        .question-modal {
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #FFD700;
          border-radius: 1rem;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
          animation: modalFadeIn 1s ease-out 1s both;
          position: relative;
        }
        
        .journal-button {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #FFFF00;
          color: #FFFF00;
          font-size: 0.8rem;
          font-weight: bold;
          cursor: pointer;
          width: auto;
          height: 40px;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          transition: all 0.2s ease;
          text-shadow: 
            0 0 10px #FFFF00,
            0 0 20px #FFFF00,
            0 0 30px #FFFF00;
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.6),
            0 0 40px rgba(255, 255, 0, 0.3);
          z-index: 10001;
          letter-spacing: 0.1em;
        }
        
        .journal-button:hover {
          transform: scale(1.1);
          text-shadow: 
            0 0 15px #FFFF00,
            0 0 25px #FFFF00,
            0 0 35px #FFFF00,
            0 0 45px #FFFF00;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #FFFF00;
          font-size: 2rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
          text-shadow: 
            0 0 10px #FFFF00,
            0 0 20px #FFFF00,
            0 0 30px #FFFF00;
          z-index: 10;
        }
        
        .close-button:hover {
          transform: scale(1.1);
          text-shadow: 
            0 0 15px #FFFF00,
            0 0 25px #FFFF00,
            0 0 35px #FFFF00,
            0 0 45px #FFFF00;
        }
        
        .solsky-header {
          margin-bottom: 2rem;
        }
        
        .daily-intention {
          color: #FFFF00;
          font-size: clamp(0.9rem, 3vw, 1.1rem);
          margin-bottom: 0.5rem;
          text-align: center;
          font-style: italic;
          text-shadow: 0 0 8px #FFFF00;
          letter-spacing: 0.02em;
        }
        
        .solsky-header h1 {
          color: #FFFF00;
          font-size: clamp(1.8rem, 6vw, 2.5rem);
          margin: 0 0 0.25rem 0;
          text-shadow: 0 0 15px #FFFF00;
          font-weight: bold;
          letter-spacing: 0.1em;
        }
        
        .question-modal h2 {
          color: #FFFF00;
          font-size: clamp(1.3rem, 4vw, 1.6rem);
          margin: 0 0 0.75rem 0;
          text-shadow: 0 0 10px #FFFF00;
        }
        
        .cosmic-vision-section {
          margin-bottom: 1.5rem;
        }
        
        .cosmic-vision-label {
          display: block;
          color: #FFFF00;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          text-align: left;
          font-weight: 500;
        }
        
        .response-area {
          width: 100%;
          min-height: 20px;
          height: 20px;
          max-height: 40px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #FFFF00;
          border-radius: 0.5rem;
          color: #FFFF00;
          padding: 0.5rem;
          font-size: 0.9rem;
          resize: vertical;
          font-family: inherit;
        }
        
        .response-area::placeholder {
          color: rgba(255, 255, 0, 0.6);
        }
        
        .response-area:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
          border-color: #FFFF00;
        }
        
        .send-button {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          color: #000;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }
        
        .send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }
        
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .send-button-completed {
          background: rgba(0,255,0,0.1);
          border: 2px solid #00FF00;
          color: #00FF00;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: not-allowed;
          transition: all 0.3s ease;
          text-shadow: 0 0 8px #00FF00, 0 0 16px #00FF00, 0 0 24px #00FF00;
          box-shadow: 0 0 20px rgba(0,255,0,0.6), 0 0 40px rgba(0,255,0,0.4);
        }
        
        .star-animation-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }
        
        .forming-star {
          font-size: 4rem;
          animation: starFormation 5s ease-out forwards;
        }
        
        @keyframes warpToBlack {
          0% {
            background: radial-gradient(circle at center, transparent 0%, transparent 40%, #000 100%);
          }
          100% {
            background: #000;
          }
        }
        
        @keyframes modalFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes soulSkyGlow {
          0% {
            text-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF00;
          }
          100% {
            text-shadow: 0 0 30px #FFFF00, 0 0 60px #FFFF00, 0 0 80px #FFFF00;
          }
        }
        
        @keyframes starFormation {
          0% {
            transform: scale(0.1) rotate(0deg);
            opacity: 0;
            filter: brightness(1);
          }
          25% {
            transform: scale(1) rotate(90deg);
            opacity: 1;
            filter: brightness(3) drop-shadow(0 0 20px #FFD700);
          }
          50% {
            transform: scale(1.5) rotate(180deg);
            filter: brightness(5) drop-shadow(0 0 40px #FFD700) drop-shadow(0 0 60px #FFF);
          }
          75% {
            transform: scale(1.2) rotate(270deg) translateY(-50px);
            filter: brightness(4) drop-shadow(0 0 30px #FFD700);
          }
          100% {
            transform: scale(0.3) rotate(360deg) translateY(-200px) translateX(100px);
            opacity: 0.2;
            filter: brightness(2) drop-shadow(0 0 10px #FFD700);
          }
        }
        
        @keyframes soulStarGlow {
          0% {
            text-shadow: 
              0 0 10px #FFFF00,
              0 0 20px #FFFF00,
              0 0 30px #FFFF00;
            box-shadow: 
              0 0 20px rgba(255, 255, 0, 0.6),
              0 0 40px rgba(255, 255, 0, 0.4);
          }
          100% {
            text-shadow: 
              0 0 15px #FFFF00,
              0 0 30px #FFFF00,
              0 0 45px #FFFF00,
              0 0 60px #FFFF00;
            box-shadow: 
              0 0 30px rgba(255, 255, 0, 0.8),
              0 0 60px rgba(255, 255, 0, 0.6),
              0 0 80px rgba(255, 255, 0, 0.4);
          }
        }
        
        .journal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .journal-modal {
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFFF00;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 500px;
          width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 0 50px rgba(255, 255, 0, 0.3);
        }
        
        .journal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #FFFF00;
          font-size: 2rem;
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
          text-shadow: 0 0 10px #FFFF00;
        }
        
        .journal-close:hover {
          transform: scale(1.1);
          text-shadow: 0 0 20px #FFFF00;
        }
        
        .journal-modal h2 {
          color: #FFFF00;
          text-align: center;
          margin-bottom: 2rem;
          text-shadow: 0 0 15px #FFFF00;
          font-size: 1.8rem;
        }
        
        .journal-entry {
          color: #FFFFFF;
        }
        
        .journal-field {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 0, 0.1);
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 0, 0.3);
        }
        
        .journal-field label {
          display: block;
          color: #FFFF00;
          font-weight: bold;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 8px #FFFF00;
        }
        
        .journal-field span,
        .response-text {
          color: #FFFFFF;
          line-height: 1.6;
        }
        
        .response-text {
          background: rgba(0, 0, 0, 0.5);
          padding: 0.75rem;
          border-radius: 0.25rem;
          border: 1px solid rgba(255, 255, 0, 0.2);
          min-height: 60px;
          font-style: italic;
        }
        
        .save-journal-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          color: #000;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
          width: 100%;
          margin-top: 1rem;
        }
        
        .save-journal-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }
        
        .save-journal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Journal View Styles */
        .journal-view {
          min-height: 500px;
          max-width: 600px;
          width: 95vw;
        }
        
        .journal-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .journal-header h1 {
          color: #FFFF00;
          font-size: clamp(1.8rem, 5vw, 2.2rem);
          margin: 0 0 0.5rem 0;
          text-shadow: 0 0 15px #FFFF00;
          font-weight: bold;
          letter-spacing: 0.1em;
        }
        
        .journal-date {
          color: #FFFFFF;
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        .journal-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .journal-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .journal-field label {
          color: #FFFF00;
          font-weight: bold;
          font-size: 1rem;
          text-shadow: 0 0 8px #FFFF00;
        }
        
        .journal-input,
        .journal-textarea {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #FFFF00;
          border-radius: 0.5rem;
          color: #FFFFFF;
          padding: 0.75rem;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
        }
        
        .journal-input::placeholder,
        .journal-textarea::placeholder {
          color: rgba(255, 255, 0, 0.6);
        }
        
        .journal-input:focus,
        .journal-textarea:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
          border-color: #FFD700;
        }
        
        .journal-textarea {
          min-height: 100px;
        }
        
        .journal-field.readonly {
          opacity: 0.7;
        }
        
        .journal-date-display {
          color: #FFFFFF;
          padding: 0.5rem;
          background: rgba(255, 255, 0, 0.1);
          border-radius: 0.25rem;
          border: 1px solid rgba(255, 255, 0, 0.3);
        }
        
        .journal-message {
          padding: 0.75rem;
          border-radius: 0.5rem;
          text-align: center;
          font-weight: bold;
        }
        
        .journal-message.error {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid #FF6B6B;
          color: #FF6B6B;
        }
        
        .journal-message.success {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #51CF66;
          color: #51CF66;
          text-shadow: 0 0 8px #51CF66;
        }
        
        .journal-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .save-button,
        .close-journal-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .save-button {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #000;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }
        
        .save-button:hover {
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }
        
        .close-journal-button {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .close-journal-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.02);
        }
        
        @media (max-width: 768px) {
          .journal-view {
            max-width: 95vw;
            padding: 1.5rem;
          }
          
          .journal-buttons {
            flex-direction: column;
          }
          
          .journal-header h1 {
            font-size: 1.6rem;
          }
        }
      `}</style>
      
      <audio ref={sfxRef} src="/audio/star.mp3" preload="auto" playsInline />

      {/* Compact Journal Popup */}
      {showModal && (
        <div className="journal-popup-overlay">
          <div className="journal-popup">
            {!showStarAnimation && !showJournalView && (
              <div className="quick-reflection-panel">
                <div className="popup-header">
                  <h3>Today's Soul Journal</h3>
                  <button 
                    className="popup-close"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="popup-date">{new Date().toLocaleDateString()}</div>
                
                <div className="quick-form">
                  <div className="form-field">
                    <label>Intention</label>
                    <input
                      type="text"
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      placeholder="Your intention for today"
                      className="popup-input"
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>Reflection</label>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Reflect on your day..."
                      className="popup-textarea"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>Soul Star</label>
                    <input
                      type="text"
                      value={soulStar}
                      onChange={(e) => setSoulStar(e.target.value)}
                      placeholder="Name your star"
                      className="popup-input"
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>Cosmic Vision</label>
                    <textarea
                      value={questionResponse}
                      onChange={(e) => setQuestionResponse(e.target.value)}
                      placeholder="Share your cosmic vision..."
                      className="popup-textarea"
                      rows={2}
                    />
                  </div>
                  
                  {validationMessage && (
                    <div className="popup-message error">{validationMessage}</div>
                  )}
                  
                  {saveMessage && (
                    <div className="popup-message success">{saveMessage}</div>
                  )}
                  
                  <div className="popup-actions">
                    <button 
                      onClick={saveJournalEntry}
                      className="save-entry-btn"
                    >
                      Save Entry
                    </button>
                    <button 
                      onClick={handleSendResponse}
                      className={isJournalCompleted ? "cast-completed" : "cast-star-btn"}
                      disabled={!questionResponse.trim() || isJournalCompleted}
                    >
                      {isJournalCompleted ? "Star Shining" : 'Cast Star'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showSoulSky && showStarAnimation && (
              <div className="soul-sky-header">
                <h1>SOUL SKY</h1>
              </div>
            )}

            {showStarAnimation && (
              <div className="star-animation-container">
                <div className="forming-star">✨</div>
              </div>
            )}

            {/* Journal View */}
            {!showStarAnimation && showJournalView && (
              <div className="question-modal journal-view">
                <button 
                  className="close-button"
                  onClick={closeJournalView}
                  aria-label="Close Journal"
                >
                  ×
                </button>
                <div className="journal-header">
                  <h1>Today's Soul Journal</h1>
                  <div className="journal-date">{new Date().toLocaleDateString()}</div>
                </div>
                
                <div className="journal-form">
                  <div className="journal-field">
                    <label>Intention of the day</label>
                    <input
                      type="text"
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      placeholder="What is your intention for today?"
                      className="journal-input"
                    />
                  </div>
                  
                  <div className="journal-field">
                    <label>Reflection</label>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Reflect on your day..."
                      className="journal-textarea"
                      rows={4}
                    />
                  </div>
                  
                  <div className="journal-field">
                    <label>Soul Star</label>
                    <input
                      type="text"
                      value={soulStar}
                      onChange={(e) => setSoulStar(e.target.value)}
                      placeholder="Name your star for today"
                      className="journal-input"
                    />
                  </div>
                  
                  <div className="journal-field readonly">
                    <label>Date</label>
                    <div className="journal-date-display">{new Date().toLocaleDateString()}</div>
                  </div>
                  
                  {validationMessage && (
                    <div className="journal-message error">{validationMessage}</div>
                  )}
                  
                  {saveMessage && (
                    <div className="journal-message success">{saveMessage}</div>
                  )}
                  
                  <div className="journal-buttons">
                    <button onClick={saveJournalEntry} className="save-button">
                      Save Entry
                    </button>
                    <button onClick={closeJournalView} className="close-journal-button">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="journal-overlay">
          <div className="journal-modal">
            <button 
              className="journal-close"
              onClick={() => setShowJournalModal(false)}
              aria-label="Close Journal"
            >
              ×
            </button>
            <h2>Soul Journal</h2>
            <div className="journal-entry">
              <div className="journal-field">
                <label>Date:</label>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="journal-field">
                <label>Intention:</label>
                <span>Find peace in the present moment</span>
              </div>
              <div className="journal-field">
                <label>Reflection:</label>
                <span>Share your cosmic vision</span>
              </div>
              <div className="journal-field">
                <label>Your Response:</label>
                <div className="response-text">{questionResponse || "No response yet..."}</div>
              </div>
              <button 
                className="save-journal-btn"
                onClick={saveJournalEntry}
                disabled={!questionResponse.trim()}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}