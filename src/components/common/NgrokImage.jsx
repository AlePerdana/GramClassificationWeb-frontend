import React, { useEffect, useState, forwardRef } from 'react';

const NGROK_HEADER = { 'ngrok-skip-browser-warning': '1' };

const addNgrokParam = (url) => {
  if (!url || /ngrok/i.test(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ngrok-skip-browser-warning=1`;
};

const NgrokImage = forwardRef(({ src, alt, ...props }, ref) => {
  const [resolvedSrc, setResolvedSrc] = useState(addNgrokParam(src) || '');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const controller = new AbortController();

    if (!src) {
      setResolvedSrc('');
      return;
    }

    // If not an ngrok URL, use directly
    if (!/ngrok/i.test(src)) {
      setResolvedSrc(src);
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(src, {
          headers: NGROK_HEADER,
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Failed: ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setResolvedSrc(objectUrl);
      } catch {
        // Fallback: use direct img with ngrok query param
        if (active) {
          const paramUrl = src.includes('ngrok-skip-browser-warning')
            ? src
            : `${src}${src.includes('?') ? '&' : '?'}ngrok-skip-browser-warning=1`;
          setResolvedSrc(paramUrl);
        }
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, retryKey]);

  return (
    <img
      ref={ref}
      src={resolvedSrc}
      alt={alt}
      onError={() => setRetryKey(k => k + 1)}
      {...props}
    />
  );
});

NgrokImage.displayName = 'NgrokImage';

export default NgrokImage;
