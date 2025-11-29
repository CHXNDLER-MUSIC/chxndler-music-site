"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import HeartversePopup from "@/components/HeartversePopup";

type Props = {
  open: boolean;
  onClose: () => void;
};

type StoreItem = {
  name: string;
  image: string;
  image2?: string;
  stripeUrl: string;
  description: string;
  cost: number;
  heartCoin: number;
};

const storeItems: StoreItem[] = [
  {
    name: "PIN",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/pin.png",
    stripeUrl: "https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B",
    description: "A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.",
    cost: 4.5,
    heartCoin: 3
  },
  {
    name: "PATCH",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/patch.png",
    image2: "https://ik.imagekit.io/CHXNDLER/STORE/patch-inverse.png",
    stripeUrl: "https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C",
    description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "Sticker",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/sticker.png",
    stripeUrl: "https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F",
    description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story.",
    cost: 3,
    heartCoin: 2
  },
  {
    name: "Hat",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/hat.png",
    stripeUrl: "https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I",
    description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Keychain",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/keychain.png",
    stripeUrl: "https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H",
    description: "A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you're connected, always.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "House Party Poster",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/house-party-poster.png",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Necklace",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/necklace.png",
    stripeUrl: "https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K",
    description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here.",
    cost: 18,
    heartCoin: 12
  },
  {
    name: "Beanie",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/beanie-front.png",
    image2: "https://ik.imagekit.io/CHXNDLER/STORE/beanie-back.png",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Button",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/button.png",
    stripeUrl: "https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J",
    description: "A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "Bracelet",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/bracelet.png",
    stripeUrl: "https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N",
    description: "A reminder you wear on your wrist that you're growing, healing, and finding your place. It's a quiet symbol that you belong here, with the ones who feel deeply and love endlessly.",
    cost: 24,
    heartCoin: 16
  },
  {
    name: "Pick",
    image: "https://ik.imagekit.io/CHXNDLER/STORE/pick.png",
    stripeUrl: "https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O",
    description: "Your reminder to follow your passion wherever it leads. A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.",
    cost: 6,
    heartCoin: 4
  }
];

export default function HeartCoinModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback?profileSetup=1" },
      });
      if (error) throw error;
      setMessage("Check your email for a magic link.");
    } catch (e: any) {
      setError(e?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      setMessage("Check your phone for a verification code.");
    } catch (e: any) {
      setError(e?.message || "Failed to send SMS");
    } finally {
      setLoading(false);
    }
  }

  const handlePurchase = (stripeUrl: string) => {
    window.open(stripeUrl, '_blank');
  };

  const totalPages = Math.ceil(storeItems.length / itemsPerPage);
  const currentItems = storeItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <HeartversePopup 
      isOpen={open} 
      onClose={onClose} 
      title=""
    >
      <div className="relative">
        {/* Store Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
          {currentItems.map((item, index) => (
            <div key={index} className="text-center space-y-4 p-4 bg-black/20 rounded-lg transition-all duration-300">
              <h3 className="text-lg font-bold text-white tracking-wider">
                {item.name.toUpperCase()}
              </h3>
              
              {/* Item Images */}
              <div className="relative h-48 w-full flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
                {item.image2 && (
                  <img
                    src={item.image2}
                    alt={`${item.name} alternative view`}
                    className="max-h-full max-w-full object-contain rounded-lg absolute top-0 left-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  />
                )}
              </div>
              
              {/* Description */}
              <div className="text-white/80 text-xs leading-relaxed px-2 break-words">
                {item.description.toUpperCase()}
              </div>
              
              {/* Price and Heart Coins */}
              <div className="flex items-center justify-center gap-4 text-center">
                <button
                  onClick={() => handlePurchase(item.stripeUrl)}
                  className="px-3 py-2 rounded-lg font-bold text-sm text-green-400 hover:bg-green-500/20 hover:scale-105 transition-all duration-200"
                >
                  PAY WITH ${item.cost % 1 === 0 ? item.cost.toFixed(0) : item.cost.toFixed(1)}
                </button>
                <button
                  onClick={() => handlePurchase(item.stripeUrl)}
                  className="flex items-center gap-1 hover:scale-105 transition-transform duration-200 cursor-pointer"
                >
                  <img
                    src="/elements/heart-coin.webp"
                    alt="Heart Coin"
                    className="w-4 h-4 object-contain"
                    style={{
                      filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 2px #FC54AF)'
                    }}
                  />
                  <span className="text-sm font-bold text-[#F2EF1D]">{item.heartCoin}</span>
                </button>
              </div>
              
              {/* Add to Collection Button */}
              <button
                onClick={() => handlePurchase(item.stripeUrl)}
                className="w-full py-2 px-4 rounded-lg font-bold text-xs bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)] transition-all duration-200"
                style={{
                  boxShadow: '0 0 15px rgba(242,239,29,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                }}
              >
                Add to Collection
              </button>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={`p-3 rounded-full border-2 transition-all duration-300 ${
                currentPage === 0
                  ? 'border-white/20 text-white/30 cursor-not-allowed'
                  : 'border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black hover:shadow-[0_0_15px_rgba(242,239,29,0.6)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentPage
                      ? 'bg-[#F2EF1D] shadow-[0_0_8px_rgba(242,239,29,0.8)]'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className={`p-3 rounded-full border-2 transition-all duration-300 ${
                currentPage === totalPages - 1
                  ? 'border-white/20 text-white/30 cursor-not-allowed'
                  : 'border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black hover:shadow-[0_0_15px_rgba(242,239,29,0.6)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </HeartversePopup>
  );
}
