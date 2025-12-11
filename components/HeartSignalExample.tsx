"use client";

import { useState } from 'react';
import HeartSignalLive from './HeartSignalLive';
import ChatBox from './ChatBox';
import SignalChat from './SignalChat';

// Example component showing how to use the new Heart Signal Live chat components
export default function HeartSignalExample() {
  const [showHeartSignalLive, setShowHeartSignalLive] = useState(false);
  const [showSignalChat, setShowSignalChat] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Heart Signal Live Chat System
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="space-y-4">
            <div className="bg-black/50 rounded-lg p-6 border border-purple-500/30">
              <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowHeartSignalLive(!showHeartSignalLive)}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    showHeartSignalLive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {showHeartSignalLive ? 'Hide' : 'Show'} Heart Signal Live Panel
                </button>

                <button
                  onClick={() => setShowSignalChat(!showSignalChat)}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    showSignalChat
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {showSignalChat ? 'Hide' : 'Show'} Signal Chat Popup
                </button>
              </div>
            </div>

            {/* Embedded ChatBox Example */}
            <div className="bg-black/50 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">
                Embedded ChatBox
              </h3>
              <ChatBox className="h-64" maxMessages={20} />
            </div>
          </div>

          {/* Information Panel */}
          <div className="space-y-4">
            <div className="bg-black/50 rounded-lg p-6 border border-purple-500/30">
              <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
              
              <div className="space-y-3 text-gray-300">
                <div>
                  <h3 className="text-purple-400 font-semibold">HeartSignalLive</h3>
                  <p className="text-sm">
                    Full-screen chat panel that slides in from the left. 
                    Shows all global messages with real-time updates.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-green-400 font-semibold">SignalChat</h3>
                  <p className="text-sm">
                    Floating chat popup that appears from bottom-right. 
                    Compact interface for quick messaging.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-blue-400 font-semibold">ChatBox</h3>
                  <p className="text-sm">
                    Embeddable chat component for integration into other pages.
                    Customizable size and message limits.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/50 rounded-lg p-6 border border-purple-500/30">
              <h2 className="text-xl font-semibold text-white mb-4">Real-time Features</h2>
              
              <div className="space-y-2 text-gray-300 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Global message broadcasting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>System connection messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time message updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>User identification by color</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heart Signal Live Panel */}
        <HeartSignalLive 
          isOpen={showHeartSignalLive}
          onClose={() => setShowHeartSignalLive(false)}
        />

        {/* Signal Chat Popup */}
        <SignalChat 
          isVisible={showSignalChat}
          onToggle={() => setShowSignalChat(!showSignalChat)}
        />
      </div>
    </div>
  );
}