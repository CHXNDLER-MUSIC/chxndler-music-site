"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/sfx';

interface CheckoutFormData {
  fullName: string;
  streetAddress: string;
  apartment: string;
  city: string;
  stateRegion: string;
  zipPostal: string;
  country: string;
  email: string;
  phone: string;
}

interface HeartCardCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (shippingAddress: CheckoutFormData) => void;
  cardTitle: string;
  cardCost: number;
  userEmail?: string;
  userPhone?: string;
}

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'South Korea',
  'Brazil',
  'Mexico',
  'Argentina',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Switzerland',
  'Austria',
  'Belgium',
  'Portugal',
  'Ireland',
  'New Zealand',
  'Singapore',
  'Hong Kong',
  'Taiwan',
  'Thailand',
  'Malaysia',
  'Philippines',
  'Indonesia',
  'Vietnam',
  'India',
  'South Africa',
  'Kenya',
  'Nigeria',
  'Egypt',
  'Morocco',
  'Israel',
  'Turkey',
  'Greece',
  'Poland',
  'Czech Republic',
  'Hungary',
  'Romania',
  'Bulgaria',
  'Croatia',
  'Estonia',
  'Latvia',
  'Lithuania',
  'Slovenia',
  'Slovakia',
  'Luxembourg',
  'Malta',
  'Cyprus',
  'Iceland',
  'Russia',
  'Ukraine',
  'Belarus',
  'China',
  'Colombia',
  'Peru',
  'Chile',
  'Venezuela',
  'Ecuador',
  'Uruguay',
  'Paraguay',
  'Bolivia',
  'Costa Rica',
  'Panama',
  'Guatemala',
  'Honduras',
  'El Salvador',
  'Nicaragua',
  'Belize',
  'Jamaica',
  'Trinidad and Tobago',
  'Barbados',
  'Dominican Republic',
  'Haiti',
  'Puerto Rico',
  'Cuba'
].sort();

export default function HeartCardCheckout({
  isOpen,
  onClose,
  onSuccess,
  cardTitle,
  cardCost,
  userEmail,
  userPhone
}: HeartCardCheckoutProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    streetAddress: '',
    apartment: '',
    city: '',
    stateRegion: '',
    zipPostal: '',
    country: 'United States',
    email: userEmail || '',
    phone: userPhone || ''
  });

  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CheckoutFormData> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.stateRegion.trim()) newErrors.stateRegion = 'State/region is required';
    if (!formData.zipPostal.trim()) newErrors.zipPostal = 'Zip/postal code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    
    if (!userEmail && !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      try { sfx.play('close', 0.4); } catch {}
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/heart-coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle,
          heartCoins: cardCost,
          shippingAddress: {
            fullName: formData.fullName,
            streetAddress: formData.streetAddress,
            apartment: formData.apartment,
            city: formData.city,
            stateRegion: formData.stateRegion,
            zipPostal: formData.zipPostal,
            country: formData.country
          },
          email: formData.email || userEmail,
          phone: formData.phone
        })
      });

      const result = await response.json();

      if (response.ok) {
        try { sfx.play('click', 0.7); } catch {}
        onSuccess(formData);
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setErrors({ fullName: 'Purchase failed. Please try again.' });
      try { sfx.play('close', 0.4); } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    try { sfx.play('close', 0.4); } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md bg-black/90 backdrop-blur-lg border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#19E3FF]">Checkout</h2>
            <button
              type="button"
              onClick={handleClose}
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              className="w-8 h-8 rounded-full bg-[#19E3FF]/20 hover:bg-[#19E3FF]/40 text-[#19E3FF] flex items-center justify-center transition-all duration-200"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-[#9EEBFF] mb-4">
            <span className="font-semibold">{cardTitle}</span> • <span className="text-[#F2EF1D] font-bold">{cardCost}</span> Heart Coins
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
              placeholder="Enter your full name"
            />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Street Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.streetAddress}
              onChange={(e) => handleInputChange('streetAddress', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
              placeholder="Enter street address"
            />
            {errors.streetAddress && <p className="text-red-400 text-xs mt-1">{errors.streetAddress}</p>}
          </div>

          {/* Apartment */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Apartment or Unit
            </label>
            <input
              type="text"
              value={formData.apartment}
              onChange={(e) => handleInputChange('apartment', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
              placeholder="Apt, suite, unit, etc. (optional)"
            />
          </div>

          {/* City, State/Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
                placeholder="City"
              />
              {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
                State/Region <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.stateRegion}
                onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
                placeholder="State/Region"
              />
              {errors.stateRegion && <p className="text-red-400 text-xs mt-1">{errors.stateRegion}</p>}
            </div>
          </div>

          {/* Zip/Postal Code */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Zip or Postal Code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.zipPostal}
              onChange={(e) => handleInputChange('zipPostal', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
              placeholder="Enter zip or postal code"
            />
            {errors.zipPostal && <p className="text-red-400 text-xs mt-1">{errors.zipPostal}</p>}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white focus:border-[#19E3FF] focus:outline-none"
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country} className="bg-black">
                  {country}
                </option>
              ))}
            </select>
            {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
          </div>

          {/* Email */}
          {!userEmail && (
            <div>
              <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
          )}

          {userEmail && (
            <div>
              <label className="block text-sm font-medium text-[#CFF7FF] mb-1">Email</label>
              <input
                type="email"
                value={userEmail}
                readOnly
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded text-gray-300 cursor-not-allowed"
              />
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#CFF7FF] mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none"
              placeholder="Enter phone number (optional)"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
              className={`w-full py-3 px-6 rounded-lg font-bold text-black transition-all duration-200 ${
                isSubmitting 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
              }`}
              style={!isSubmitting ? {
                boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
              } : {}}
            >
              {isSubmitting ? 'Processing...' : `Purchase with Heart Coins`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}