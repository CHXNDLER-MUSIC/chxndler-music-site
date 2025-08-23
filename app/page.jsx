function CoverImage({ src, alt, cacheKey }) {
  const [okSrc, setOkSrc] = useState(src);

  // Bust cache when track changes
  useEffect(() => {
    const q = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : "";
    setOkSrc(src + q);
  }, [src, cacheKey]);

  return (
    <img
      src={okSrc}
      alt={alt}
      decoding="async"
      loading="eager"
      onError={(e) => {
        // Log exactly what failed so we can see it in Console
        // eslint-disable-next-line no-console
        console.error("Cover failed to load:", okSrc);
        setOkSrc(PATHS.logoFallback);
      }}
      className="h-14 w-14 md:h-16 md:w-16 rounded-lg object-cover shadow-[0_0_12px_rgba(0,0,0,.45)]"
      draggable={false}
    />
  );
}
