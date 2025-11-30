"use client";
import { sfx } from "@/lib/sfx";

export default function CoverCard({ src = "/covers/OCEAN GIRL.webp", label, size = 100, responsive = false, trackSlug = null, onClick = null }) {
  // If responsive is true, use responsive classes similar to song listing scaling
  const responsiveClasses = responsive 
    ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
    : "";

  // Get element color based on track slug (matching MediaPlayer logic)
  const getElementColor = (slug) => {
    if (!slug) return "#19E3FF"; // Default cyan
    const s = String(slug).toLowerCase();
    // Specific themes first (matching logic from MediaPlayer)
    if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "#38B6FF"; // water
    if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "#FC54AF"; // heart/pink
    if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "#FFC700"; // lightning/yellow
    if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "#666666"; // darkness (use gray for visibility)
    if (s.includes("fire") || s.includes("burn")) return "#FF6B35"; // fire/orange
    if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "#F2EF1D"; // earth/yellow
    if (s.includes("air") || s.includes("sky")) return "#8BF9FF"; // air/light cyan
    return "#19E3FF"; // fallback to cyan
  };

  const elementColor = getElementColor(trackSlug || src);

  // Convert hex color to rgba for CSS interpolation
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Function to get the card image from the cover image src
  const getCardImageFromCover = (coverSrc) => {
    // Extract song name from cover path
    const filename = coverSrc.split('/').pop()?.replace('.webp', '').replace('.jpg', '').replace('.png', '') || '';
    const songName = filename.toUpperCase();
    
    // Mapping from song names to card images (same as in BinderModal)
    const songImages = {
      'ALWAYS ON MY MIND': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'ALWAYS ON MY MIND (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind-remix.png?updatedAt=1762388342107',
      'ALONE': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'ALONE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'AMERICAN DREAM': 'https://ik.imagekit.io/CHXNDLER/card/american-dream.png?updatedAt=1762388346126',
      'BABY': 'https://ik.imagekit.io/CHXNDLER/card/baby.png?updatedAt=1762388345192',
      'BE MY BEE': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee.png?updatedAt=1762388342848',
      'BE MY BEE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee-acoustic.png?updatedAt=1762388342912',
      'BLUE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/BLUE%20(ACOUSTIC).png?updatedAt=1763055066119',
      'BLUE': 'https://ik.imagekit.io/CHXNDLER/card/blue.png?updatedAt=1762388346777',
      'BRAIN FREEZE': 'https://ik.imagekit.io/CHXNDLER/card/brain-freeze.png?updatedAt=1762388347224',
      'CHEERLEADER (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'CHEERLEADER': 'https://ik.imagekit.io/CHXNDLER/card/cheerleader.png?updatedAt=1762388346177',
      'COLLIDE': 'https://ik.imagekit.io/CHXNDLER/card/collide.png?updatedAt=1762388347054',
      'COLORS OF OUR HOME': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20.png?updatedAt=1763055065493',
      'COLORS OF OUR HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763055064803',
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
      'FEELING THIS': 'https://ik.imagekit.io/CHXNDLER/card/feeling-this.png?updatedAt=1762388347289',
      'GAME BOY HEART': 'https://ik.imagekit.io/CHXNDLER/card/game-boy-heart.png?updatedAt=1762388346348',
      'HOME': 'https://ik.imagekit.io/CHXNDLER/card/home.png?updatedAt=1762388345590',
      'HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/home-acoustic.png?updatedAt=1762388344295',
      'HOUSE PARTY': 'https://ik.imagekit.io/CHXNDLER/card/HOUSE%20PARTY.png?updatedAt=1763055601783',
      'HOUSE PARTY (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/house-party-acoustic.png?updatedAt=1762388343028',
      'I MIGHT FALL IN LOVE WITH YOU': 'https://ik.imagekit.io/CHXNDLER/card/i-might-fall-in-love-with-you.png?updatedAt=1762388340663',
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/I%20MIGHT%20FALL%20IN%20LOVE%20WITH%20YOU%20(ACOUSTIC).png?updatedAt=1763055066309',
      'KID FOREVER': 'https://ik.imagekit.io/CHXNDLER/card/kid-forever.png?updatedAt=1762388339589',
      'LETTING GO': 'https://ik.imagekit.io/CHXNDLER/card/letting-go.png?updatedAt=1762388344472',
      'LITTLE BLACK HEART': 'https://ik.imagekit.io/CHXNDLER/card/little-black-heart.png?updatedAt=1762388346814',
      'LITTLE BLACK HEART (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/LITTLE%20BLACK%20HEART%20(ACOUSTIC).png?updatedAt=1763055066090',
      'LOVE ME': 'https://ik.imagekit.io/CHXNDLER/card/love-me.png?updatedAt=1762388339563',
      'LOVE ME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/love-me-acoustic.png?updatedAt=1762388330787',
      'MAKE BELIEVE': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'MR. BRIGHTSIDE': 'https://ik.imagekit.io/CHXNDLER/card/mr.brightside.png?updatedAt=1762388346700',
      'OCEAN GIRL': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl.png?updatedAt=1762388343942',
      'OCEAN GIRL (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-acoustic.png?updatedAt=1762388344386',
      'OCEAN GIRL (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-remix.png?updatedAt=1762388346301',
      'PARIS': 'https://ik.imagekit.io/CHXNDLER/card/paris.png?updatedAt=1762388344978',
      'PINK MOON': 'https://ik.imagekit.io/CHXNDLER/card/pink-moon.png?updatedAt=1762388347173',
      'POKÉMON': 'https://ik.imagekit.io/CHXNDLER/card/pokemon.png?updatedAt=1762388341960',
      'SOMEBODY TO LOVE': 'https://ik.imagekit.io/CHXNDLER/card/somebody-to-love.png?updatedAt=1762388347148',
      'TIENES UN AMIGO': 'https://ik.imagekit.io/CHXNDLER/card/tienes-un-amigo.png?updatedAt=1762388343639',
      'WE\'RE JUST FRIENDS': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends.png?updatedAt=1762388347233',
      'WE\'RE JUST FRIENDS (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-acoustic.png?updatedAt=1762388340285',
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-dmvrco-remix.png?updatedAt=1762388345669',
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-mickey-jas-remix.png?updatedAt=1762388346859',
      'CHXNDLER': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'WATER': 'https://ik.imagekit.io/CHXNDLER/card/WATER.png',
      'HEART': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'LIGHTNING': 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png',
      'DARKNESS': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
    };
    
    return songImages[songName] || 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910';
  };

  const handleClick = () => {
    // Slightly reduce flip volume for a softer click
    sfx.play('flip', 0.5);
    
    // If onClick prop is provided, call it with the card image data
    if (onClick) {
      const cardImageSrc = getCardImageFromCover(src);
      const songName = src.split('/').pop()?.replace('.webp', '').replace('.jpg', '').replace('.png', '') || '';
      onClick({
        image: cardImageSrc,
        name: songName.toUpperCase(),
        src: cardImageSrc
      });
    }
  };
    
  return (
    <div className="flex flex-col items-start">
      <div
        className={`cover-art-container group relative rounded-[12px] overflow-hidden cursor-pointer ${responsiveClasses}`}
        style={responsive ? { WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' } : { width: size - 10, height: size - 10, WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover"
          onError={(e)=>{ e.currentTarget.src = "/logo/CHXNDLER_Logo.png"; }}
        />
        {/* Blue fill overlay: desktop blur only; mobile has no backdrop blur to avoid flicker */}
        <div className="blue-fill-overlay pointer-events-none absolute inset-0" />
        {/* inner neon rim */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px]" style={{ border: `1px solid ${hexToRgba(elementColor, 0.4)}` }} />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      {label ? (
        <span className={`mt-1 tracking-wide text-cyan-100/90 ${responsive ? "text-[9px] sm:text-[10px] md:text-xs" : "text-[10px]"}`}>{label}</span>
      ) : null}
      <style jsx>{`
        .cover-art-container{ 
          outline:1px solid ${hexToRgba(elementColor, 0.4)};
          box-shadow: 0 0 20px ${hexToRgba(elementColor, 0.12)};
          transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease, filter .2s ease;
        }
        /* Match dropdown snappy feel for inner image + overlay */
        .cover-art-container img{
          transition: filter .15s ease;
        }
        .cover-art-container:hover{
          transform: translateZ(0) scale(1.04);
          outline-color: ${hexToRgba(elementColor, 0.8)};
          box-shadow:
            0 0 36px ${hexToRgba(elementColor, 0.55)},
            0 0 64px ${hexToRgba(elementColor, 0.35)},
            inset 0 0 10px ${hexToRgba(elementColor, 0.18)};
        }
        .cover-art-container:hover img{ 
          filter: brightness(1.25) contrast(1.15) saturate(1.2);
        }
        .cover-art-container:hover .blue-fill-overlay{ 
          background-color: ${hexToRgba(elementColor, 0.18)};
        }
        /* Apply a light blue background to match waveform container styling */
        .blue-fill-overlay{ transition: background-color .15s ease; background-color: rgba(6, 182, 212, 0.08); }
        /* Enable backdrop blur on desktop only to prevent iOS flicker */
        @media (hover: hover) and (pointer: fine) {
          .blue-fill-overlay{ backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
      `}</style>
    </div>
  );
}
