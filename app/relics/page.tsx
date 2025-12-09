import RelicsGallery from '@/components/RelicsGallery';

export const metadata = {
  title: 'Relic Collection | CHXNDLER',
  description: 'Explore and download your unlocked cosmic relics from the Heartverse'
};

export default function RelicsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RelicsGallery />
      </div>
    </main>
  );
}