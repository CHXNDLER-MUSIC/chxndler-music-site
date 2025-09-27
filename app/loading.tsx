export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#FC54AF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#FC54AF]">Loading...</p>
      </div>
    </div>
  )
}