import HeartversePopup from "@/components/HeartversePopup";

export default function HeartCoinModalTest() {
  const activeTab = 'earn';

  return (
    <HeartversePopup isOpen={true} onClose={() => {}} title="">
      <div className="relative flex flex-col max-h-[70vh] min-h-0">
        {activeTab === 'earn' ? (
          <div>Earn content</div>
        ) : activeTab === 'use' ? (
          <div>Use content</div>
        ) : activeTab === 'merch' ? (
          <div>Merch content</div>
        ) : activeTab === 'cards' ? (
          <div>Cards content</div>
        ) : null}
      </div>

      {/* Test modal */}
      <div>Test modal</div>
    </HeartversePopup>
  );
}