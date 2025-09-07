import type { NextApiRequest, NextApiResponse } from 'next';

// This would connect to your database in production
// For now, we'll import the same storage from the main analytics endpoint
const analyticsData: any[] = [];
const MAX_EVENTS = 10000;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { events, metadata } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'Events array is required' });
      return;
    }

    const storedEvents = events.map((eventData) => {
      const eventRecord = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event: eventData.event,
        data: eventData.data,
        timestamp: eventData.timestamp || Date.now(),
        sessionId: eventData.sessionId,
        userAgent: metadata?.userAgent,
        url: metadata?.url,
        referrer: metadata?.referrer,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        createdAt: new Date().toISOString(),
      };

      analyticsData.push(eventRecord);
      return eventRecord.id;
    });

    // Keep only recent events
    if (analyticsData.length > MAX_EVENTS) {
      analyticsData.splice(0, analyticsData.length - MAX_EVENTS);
    }

    res.status(200).json({ 
      success: true, 
      eventIds: storedEvents,
      stored: events.length 
    });
  } catch (error) {
    console.error('[Analytics Batch API] Error storing events:', error);
    res.status(500).json({ success: false, error: 'Failed to store batch events' });
  }
}