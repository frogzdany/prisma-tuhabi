"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

// Streams emotion's server-rendered CSS into the SSR HTML before it lands in
// the DOM, so the client-side hydration tree matches exactly. Without this,
// Chakra/Emotion's inline <style data-emotion> tag lands at a different DOM
// position on the client and React 19 raises a hydration mismatch.
export function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const c = createCache({ key: "css" });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => {
    const inserted = Object.keys(cache.inserted);
    if (inserted.length === 0) return null;
    return (
      <style
        data-emotion={`${cache.key} ${inserted.join(" ")}`}
        dangerouslySetInnerHTML={{
          __html: Object.values(cache.inserted).join(" "),
        }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
