'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#FC54AF]">Something went wrong!</h2>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-[#FC54AF] text-white rounded-lg hover:bg-[#FC54AF]/80 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}