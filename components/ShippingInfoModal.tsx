"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ShippingFormData {
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ShippingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shippingData: ShippingFormData) => void;
  cardTitle: string;
  cardCost: number;
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
  'Other'
].sort();

export default function ShippingInfoModal({
  isOpen,
  onClose,
  onSubmit,
  cardTitle,
  cardCost
}: ShippingInfoModalProps) {
  const [formData, setFormData] = useState<ShippingFormData>({
    fullName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  const [errors, setErrors] = useState<Partial<ShippingFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ShippingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingFormData> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State/region is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/postal code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/store/lightning.webp"
                alt="Lightning"
                className="w-12 h-12 rounded border border-yellow-400/60"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))'
                }}
              />
              <div>
                <h2 className="text-lg font-bold text-white">Shipping Information</h2>
                <p className="text-sm text-gray-400">Purchasing Physical Card:</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#19E3FF]/20 hover:bg-[#19E3FF]/40 text-[#19E3FF] flex items-center justify-center transition-all duration-200"
            >
              ×
            </button>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <h3 className="text-lg font-bold text-[#19E3FF] mb-1">{cardTitle}</h3>
            <div className="text-sm text-gray-300">
              Cost: <span className="text-[#F2EF1D] font-bold">{cardCost}</span> Heart Coins
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              FULL NAME <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white placeholder-gray-500 focus:border-[#19E3FF] focus:outline-none transition-colors"
            />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              STREET <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.streetAddress}
              onChange={(e) => handleInputChange('streetAddress', e.target.value)}
              placeholder="Enter street address"
              className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white placeholder-gray-500 focus:border-[#19E3FF] focus:outline-none transition-colors"
            />
            {errors.streetAddress && <p className="text-red-400 text-xs mt-1">{errors.streetAddress}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              CITY <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Enter city"
              className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white placeholder-gray-500 focus:border-[#19E3FF] focus:outline-none transition-colors"
            />
            {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
          </div>

          {/* State and ZIP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                STATE <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
                className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white placeholder-gray-500 focus:border-[#19E3FF] focus:outline-none transition-colors"
              />
              {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ZIP <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="ZIP Code"
                className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white placeholder-gray-500 focus:border-[#19E3FF] focus:outline-none transition-colors"
              />
              {errors.zipCode && <p className="text-red-400 text-xs mt-1">{errors.zipCode}</p>}
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              COUNTRY <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-gray-600/50 rounded text-white focus:border-[#19E3FF] focus:outline-none transition-colors"
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country} className="bg-gray-800">
                  {country}
                </option>
              ))}
            </select>
            {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-6 rounded-lg font-bold text-black transition-all duration-200 ${
                isSubmitting 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#4CAF50] to-[#45A049] hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(76,175,80,0.6)]'
              }`}
              style={!isSubmitting ? {
                boxShadow: '0 0 15px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
              } : {}}
            >
              {isSubmitting ? 'PROCESSING...' : 'CONFIRM ORDER'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}