import { NextResponse } from "next/server";

// Server-only API route to check if the YouTube channel is live.
// Uses YouTube Data API v3 search.list with filters as requested.
export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    // Missing env vars; fail soft to offline state
    if (process.env.NODE_ENV !== "production") {
      console.warn("YouTube Live API missing env vars: YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID");
    }
    // TODO: Set YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID in your environment
    return NextResponse.json({ isLive: false, videoId: null });
  }

  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    eventType: "live",
    type: "video",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    key: apiKey,
    maxResults: "1",
    order: "date",
  });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("YouTube API error status:", res.status, await res.text().catch(() => "<body read error>"));
      }
      return NextResponse.json({ isLive: false, videoId: null });
    }
    const data = await res.json();
    const item = data?.items?.[0];
    const videoId: string | null = item?.id?.videoId || null;
    return NextResponse.json({ isLive: Boolean(videoId), videoId });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("YouTube API fetch failed:", err);
    }
    // Fail soft to offline state
    return NextResponse.json({ isLive: false, videoId: null });
  }
}

