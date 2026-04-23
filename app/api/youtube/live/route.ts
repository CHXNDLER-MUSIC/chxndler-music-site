import { NextResponse } from "next/server";

// Server-only API route to check if the YouTube channel is live.
// Uses YouTube Data API v3 search.list with filters as requested.
export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  let channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandleRaw = process.env.YOUTUBE_CHANNEL_HANDLE;
  const channelHandle = channelHandleRaw?.startsWith('@') ? channelHandleRaw : (channelHandleRaw ? `@${channelHandleRaw}` : undefined);

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("YouTube Live API missing env var: YOUTUBE_API_KEY");
    }
    return NextResponse.json({ isLive: false, videoId: null });
  }

  // Resolve channel ID from handle if needed
  try {
    if (!channelId && channelHandle) {
      const chParams = new URLSearchParams({ part: "id", forHandle: channelHandle, key: apiKey });
      const chUrl = `https://www.googleapis.com/youtube/v3/channels?${chParams.toString()}`;
      const chRes = await fetch(chUrl, { next: { revalidate: 60 } });
      if (chRes.ok) {
        const chData = await chRes.json();
        const id = chData?.items?.[0]?.id;
        if (id) channelId = id;
      } else if (process.env.NODE_ENV !== "production") {
        console.warn("YouTube API channel resolve failed:", chRes.status, await chRes.text().catch(() => "<body read error>"));
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("YouTube API channel resolve error:", e);
    }
  }

  if (!channelId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("YouTube Live API missing channel identifier: set YOUTUBE_CHANNEL_ID or YOUTUBE_CHANNEL_HANDLE");
    }
    return NextResponse.json({ isLive: false, videoId: null });
  }

  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    eventType: "live",
    type: "video",
    videoEmbeddable: "true",
    key: apiKey,
    maxResults: "1",
    // Keep request simple and aligned with YouTube docs
  });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
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
