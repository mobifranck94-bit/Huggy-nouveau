import { useEffect, useCallback } from 'react';

interface TrackEvent {
  projectId?: string;
  type: string;
  metadata?: Record<string, any>;
}

export function useAnalytics() {
  const track = useCallback(async (event: TrackEvent) => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: event.projectId,
          type: event.type,
          metadata: event.metadata || {},
          timestamp: Date.now()
        })
      });
    } catch (err) {
      // Silently fail - analytics shouldn't break the app
      console.warn('[Analytics] Failed to track:', err);
    }
  }, []);

  const trackPageView = useCallback((page: string, metadata?: Record<string, any>) => {
    track({ type: 'page_view', metadata: { page, ...metadata } });
  }, [track]);

  const trackBuild = useCallback((projectId: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>) => {
    track({ 
      projectId, 
      type: `build_${status}`, 
      metadata 
    });
  }, [track]);

  const trackDeploy = useCallback((projectId: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>) => {
    track({ 
      projectId, 
      type: `deploy_${status}`, 
      metadata 
    });
  }, [track]);

  const trackFeatureUsage = useCallback((feature: string, metadata?: Record<string, any>) => {
    track({ 
      type: 'feature_usage', 
      metadata: { feature, ...metadata } 
    });
  }, [track]);

  return {
    track,
    trackPageView,
    trackBuild,
    trackDeploy,
    trackFeatureUsage
  };
}

// Hook to track page views automatically
export function usePageTracking(pageName: string) {
  useEffect(() => {
    // Track page view directly without calling useAnalytics recursively
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'page_view',
        metadata: { page: pageName, timestamp: Date.now() }
      })
    }).catch(() => {
      // Silently fail
    });
  }, [pageName]);
}

// Hook to track session duration
export function useSessionTracking() {
  const { track } = useAnalytics();

  useEffect(() => {
    const startTime = Date.now();
    
    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      track({
        type: 'session_end',
        metadata: { duration_seconds: duration }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [track]);
}
