"use client";

import { useEffect, useState } from "react";

// Probes /listings/{fixture}/cover.png + video.mp4 via HEAD. Returns whichever
// is present. Lets us ship the UI before the build script has been run — the
// listing tour card just stays hidden until assets exist.

interface ListingAssets {
  coverUrl: string | null;
  videoUrl: string | null;
  checked: boolean;
}

const cache = new Map<string, ListingAssets>();

async function headExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "force-cache" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useListingAssets(fixtureId: string): ListingAssets {
  const [assets, setAssets] = useState<ListingAssets>(() =>
    cache.get(fixtureId) ?? { coverUrl: null, videoUrl: null, checked: false }
  );

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(fixtureId);
    if (cached?.checked) {
      setAssets(cached);
      return;
    }
    const coverUrl = `/listings/${fixtureId}/cover.png`;
    const videoUrl = `/listings/${fixtureId}/video.mp4`;
    Promise.all([headExists(coverUrl), headExists(videoUrl)]).then(([coverOk, videoOk]) => {
      if (cancelled) return;
      const next: ListingAssets = {
        coverUrl: coverOk ? coverUrl : null,
        videoUrl: videoOk ? videoUrl : null,
        checked: true,
      };
      cache.set(fixtureId, next);
      setAssets(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  return assets;
}
