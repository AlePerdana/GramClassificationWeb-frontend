import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';

const appendNgrokSkip = (url) => {
  if (!url) return url;
  if (!/ngrok/i.test(url) || url.includes('ngrok-skip-browser-warning')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ngrok-skip-browser-warning=1`;
};

/**
 * AnnotatedImage — Menampilkan gambar spesimen asli dengan bounding box
 * berwarna berdasarkan hasil klasifikasi Gram.
 *
 * Props:
 *   imageUrl        — URL gambar spesimen asli (main_image_url)
 *   classifications — Array objek { id, roi_bbox, classification_gram, validation_gram, ... }
 *   containerClass  — Class CSS tambahan untuk container (opsional)
 */
const AnnotatedImage = ({ imageUrl, classifications = [], containerClass = '' }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });
  const resolvedUrl = useMemo(() => appendNgrokSkip(imageUrl), [imageUrl]);

  const updateDisplaySize = useCallback(() => {
    if (imgRef.current) {
      setDisplaySize({
        w: imgRef.current.clientWidth || 1,
        h: imgRef.current.clientHeight || 1,
      });
    }
  }, []);

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      setNatural({
        w: imgRef.current.naturalWidth || 1,
        h: imgRef.current.naturalHeight || 1,
      });
      updateDisplaySize();
    }
  }, [updateDisplaySize]);

  useEffect(() => {
    if (!imageUrl) return;
    setNatural({ w: 1, h: 1 });
    setDisplaySize({ w: 1, h: 1 });
  }, [imageUrl]);

  useEffect(() => {
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [updateDisplaySize]);

  // Filter: hanya tampilkan yang tidak ditolak dan memiliki roi_bbox
  const validBoxes = classifications.filter((c) => {
    const isRejected =
      c.is_rejected === true ||
      String(c.validation_gram || '').toLowerCase() === 'reject' ||
      String(c.validation_bentuk || '').toLowerCase() === 'reject';
    return !isRejected && c.roi_bbox;
  });

  const scaleX = displaySize.w / natural.w;
  const scaleY = displaySize.h / natural.h;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block max-w-full overflow-hidden align-top ${containerClass}`}
    >
      <img
        ref={imgRef}
        src={resolvedUrl}
        alt="Spesimen terannotasi"
        className="max-w-full h-auto block"
        onLoad={handleLoad}
        draggable={false}
      />

      {validBoxes.map((c, idx) => {
        // roi_bbox bisa format [x, y, w, h] atau {x, y, width, height}
        const bbox = Array.isArray(c.roi_bbox)
          ? { x: c.roi_bbox[0], y: c.roi_bbox[1], width: c.roi_bbox[2], height: c.roi_bbox[3] }
          : c.roi_bbox;

        if (!bbox || bbox.x === undefined || bbox.y === undefined) return null;

        const gram = c.validation_gram || c.classification_gram || '';
        const isPositive = gram.toLowerCase().includes('positif');

        return (
          <div
            key={c.id ?? idx}
            className="absolute border-2 pointer-events-none"
            style={{
              left: `${(bbox.x || 0) * scaleX}px`,
              top: `${(bbox.y || 0) * scaleY}px`,
              width: `${(bbox.width || 0) * scaleX}px`,
              height: `${(bbox.height || 0) * scaleY}px`,
              borderColor: isPositive ? '#7c3aed' : '#dc2626',
              backgroundColor: isPositive
                ? 'rgba(124, 58, 237, 0.12)'
                : 'rgba(220, 38, 38, 0.12)',
              zIndex: 10,
              borderRadius: '2px',
            }}
            title={`Gram ${gram}, ${c.validation_bentuk || c.classification_bentuk || '-'}`}
          />
        );
      })}
    </div>
  );
};

export default AnnotatedImage;
