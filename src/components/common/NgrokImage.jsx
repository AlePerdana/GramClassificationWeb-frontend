import React, { useEffect, useState } from 'react';

const NGROK_HEADER = { 'ngrok-skip-browser-warning': '1' };

const shouldProxy = (url) => /ngrok/i.test(url || '');

const NgrokImage = ({ src, alt, ...props }) => {
  const [resolvedSrc, setResolvedSrc] = useState(src || '');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const controller = new AbortController();

    const load = async () => {
      if (!src || !shouldProxy(src)) {
        setResolvedSrc(src || '');
        return;
      }

      try {
        const response = await fetch(src, {
          headers: NGROK_HEADER,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setResolvedSrc(objectUrl);
      } catch {
        if (active) setResolvedSrc(src || '');
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return <img src={resolvedSrc} alt={alt} {...props} />;
};

export default NgrokImage;
