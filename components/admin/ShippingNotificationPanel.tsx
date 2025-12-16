"use client";

import { useState } from "react";

interface ShippingNotificationProps {
  orderId: string;
  itemName: string;
  customerName: string;
  onNotificationSent?: () => void;
}

export default function ShippingNotificationPanel({ 
  orderId, 
  itemName, 
  customerName, 
  onNotificationSent 
}: ShippingNotificationProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("USPS");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/orders/send-shipping-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          trackingNumber: trackingNumber.trim() || undefined,
          shippingCarrier: shippingCarrier || undefined,
          estimatedDelivery: estimatedDelivery || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send shipping notification');
      }

      setMessage(`Shipping notification sent successfully to ${customerName}`);
      
      // Clear form
      setTrackingNumber("");
      setEstimatedDelivery("");
      
      // Notify parent component
      if (onNotificationSent) {
        onNotificationSent();
      }

    } catch (error: any) {
      console.error('Shipping notification error:', error);
      setError(error?.message || 'Failed to send shipping notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full">
      <h3 className="text-xl font-bold text-white mb-4">Send Shipping Notification</h3>
      
      <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
        <p className="text-white text-sm"><strong>Order:</strong> #{orderId}</p>
        <p className="text-white text-sm"><strong>Item:</strong> {itemName}</p>
        <p className="text-white text-sm"><strong>Customer:</strong> {customerName}</p>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSendNotification} className="space-y-4">
        <div>
          <label className="block text-white text-xs font-bold mb-2">
            Shipping Carrier *
          </label>
          <select
            value={shippingCarrier}
            onChange={(e) => setShippingCarrier(e.target.value)}
            className="w-full p-2 rounded bg-black/20 border border-white/20 text-white text-sm focus:border-[#4ECDC4] focus:outline-none"
            required
          >
            <option value="USPS">USPS</option>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="DHL">DHL</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-white text-xs font-bold mb-2">
            Tracking Number (Optional)
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full p-2 rounded bg-black/20 border border-white/20 text-white text-sm focus:border-[#4ECDC4] focus:outline-none"
            placeholder="Enter tracking number"
          />
          <p className="text-white/60 text-xs mt-1">
            Leave blank to send notification without tracking
          </p>
        </div>

        <div>
          <label className="block text-white text-xs font-bold mb-2">
            Estimated Delivery (Optional)
          </label>
          <input
            type="date"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            className="w-full p-2 rounded bg-black/20 border border-white/20 text-white text-sm focus:border-[#4ECDC4] focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-200 bg-gradient-to-r from-[#4ECDC4] to-[#45b7b8] text-black hover:scale-[1.02] disabled:bg-gray-500 disabled:text-gray-300"
            style={{
              boxShadow: isLoading ? undefined : '0 0 15px rgba(78, 205, 196, 0.4)'
            }}
          >
            {isLoading ? 'Sending...' : 'Send Shipping Notification'}
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-blue-200 text-xs">
          <strong>Note:</strong> This will send an email notification to the customer 
          and automatically update the order status to "shipped" if a tracking number is provided.
        </p>
      </div>
    </div>
  );
}