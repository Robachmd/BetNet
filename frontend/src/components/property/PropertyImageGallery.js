import React, { useState, useCallback, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

export default function PropertyImageGallery({
  images = [],
  alt = 'Property image',
  className = '',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(new Set());

  const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOWNhM2FmIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  const imgs = images.length > 0 ? images : [placeholderImg];

  const goTo = useCallback((index) => {
    setActiveIndex(Math.max(0, Math.min(index, imgs.length - 1)));
  }, [imgs.length]);

  const prev = useCallback(() => goTo(activeIndex > 0 ? activeIndex - 1 : imgs.length - 1), [activeIndex, goTo, imgs.length]);
  const next = useCallback(() => goTo(activeIndex < imgs.length - 1 ? activeIndex + 1 : 0), [activeIndex, goTo, imgs.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [fullscreen, prev, next]);

  const markLoaded = (idx) => setImgLoaded((prev) => new Set(prev).add(idx));

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main image */}
        <div
          className="relative aspect-[16/10] md:aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 cursor-pointer group"
          onClick={() => setFullscreen(true)}
        >
          <img
            src={imgs[activeIndex]}
            alt={`${alt} ${activeIndex + 1}`}
            onLoad={() => markLoaded(activeIndex)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imgLoaded.has(activeIndex) ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!imgLoaded.has(activeIndex) && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Counter */}
          <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
            {activeIndex + 1} / {imgs.length}
          </div>

          {/* Fullscreen button */}
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
            className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <FiMaximize2 className="w-4 h-4" />
          </button>

          {/* Navigation arrows */}
          {imgs.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <FiChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <FiChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {imgs.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {imgs.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === activeIndex
                    ? 'border-green-600 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>

          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 left-4 z-10 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <FiMinimize2 className="w-5 h-5" />
          </button>

          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {activeIndex + 1} / {imgs.length}
          </div>

          <img
            src={imgs[activeIndex]}
            alt={`${alt} ${activeIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
          />

          {imgs.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Thumbnail strip in fullscreen */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-1">
            {imgs.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
