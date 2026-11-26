import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ExternalLink,
  Images,
  RefreshCw,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react';
import {
  createFrameMonolithSet,
  formatOrderNumber,
  FRAME_H,
  FRAME_W,
  renderExhibitionPhotoFrame,
  SCR_H,
  SCR_W,
  SCR_X,
  SCR_Y,
  type FrameMonolithSet,
} from '../lib/photoFrameRenderer';
import {
  HeterotopiaFilterEngine,
  PHOTO_FILTERS,
  type PhotoFilterId,
} from '../lib/heterotopiaFilters';
import {
  fetchGuestbookEntries,
  formatKoreaDate,
  getGuestbookIntegrationConfig,
  loadLocalGuestbookEntries,
  shareCanvasImage,
  submitPhotoToGuestbook,
  type GuestbookPhotoEntry,
} from '../lib/guestbookBridge';
import './PhotoGuestbook.css';

type BoothStage = 'capture' | 'compose' | 'done';

interface CapturedPhoto {
  image: HTMLImageElement;
  width: number;
  height: number;
  frozenElapsedSec: number;
}

interface EdgeFloatSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  scale: number;
}

/** Curated perimeter anchor slots so floating cards frame the edges without obstructing the center booth */
const EDGE_FLOAT_SLOTS: EdgeFloatSlot[] = [
  { top: '10%', left: '2.5%', rotate: -3.2, duration: 7.4, delay: 0.0, driftX: 8, driftY: -12, scale: 1.05 },
  { top: '12%', right: '2.5%', rotate: 2.8, duration: 8.1, delay: -1.6, driftX: -9, driftY: -10, scale: 0.96 },
  { bottom: '7%', left: '2.5%', rotate: 2.5, duration: 7.8, delay: -2.2, driftX: 10, driftY: 11, scale: 0.87 },
  { bottom: '8%', right: '2.5%', rotate: -2.9, duration: 8.6, delay: -0.9, driftX: -8, driftY: 12, scale: 0.79 },
  { top: '44%', left: '1.8%', rotate: 2.1, duration: 8.8, delay: -2.9, driftX: 7, driftY: -14, scale: 0.72 },
  { top: '46%', right: '1.8%', rotate: -2.3, duration: 8.3, delay: -4.0, driftX: -7, driftY: 13, scale: 0.65 },
  { bottom: '4%', left: '19%', rotate: -1.8, duration: 7.9, delay: -1.2, driftX: 9, driftY: -9, scale: 0.59 },
  { bottom: '4%', right: '19%', rotate: 2.1, duration: 8.4, delay: -2.8, driftX: -9, driftY: -10, scale: 0.53 },
  { top: '6%', left: '18%', rotate: 1.6, duration: 8.8, delay: -3.7, driftX: 8, driftY: 8, scale: 0.48 },
  { top: '6%', right: '18%', rotate: -1.7, duration: 9.2, delay: -0.5, driftX: -8, driftY: 9, scale: 0.43 },
  { top: '28%', left: '1.2%', rotate: -2.6, duration: 9.0, delay: -1.9, driftX: 6, driftY: 9, scale: 0.39 },
  { top: '28%', right: '1.2%', rotate: 2.4, duration: 9.4, delay: -3.2, driftX: -6, driftY: -8, scale: 0.35 },
  { bottom: '23%', left: '1.4%', rotate: 1.9, duration: 8.9, delay: -2.4, driftX: 6, driftY: -7, scale: 0.32 },
  { bottom: '23%', right: '1.4%', rotate: -2.1, duration: 9.5, delay: -1.1, driftX: -6, driftY: 7, scale: 0.29 },
];

const SHUTTER_TIMER_SEC = 3;
const VERSION_POLL_MS = 20_000;

declare const __APP_BUILD_VERSION__: string;

export const PhotoGuestbookPage: React.FC = () => {
  const integration = useMemo(() => getGuestbookIntegrationConfig(), []);

  const [stage, setStage] = useState<BoothStage>('capture');
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'starting' | 'ready' | 'error'
  >('idle');
  const [cameraRetryKey, setCameraRetryKey] = useState<number>(0);

  // Booth & frame state
  const [activeFilter, setActiveFilter] = useState<PhotoFilterId>('kinetic');
  const activeFilterRef = useRef<PhotoFilterId>('kinetic');
  const filterEngineRef = useRef<HeterotopiaFilterEngine | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [screenLightActive, setScreenLightActive] = useState<boolean>(false);
  const [monoliths] = useState<FrameMonolithSet>(() =>
    createFrameMonolithSet(20261125)
  );
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);

  // Guestbook compose state (message only, no nickname)
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmitSynced, setLastSubmitSynced] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');

  // Guestbook gallery state
  const [entries, setEntries] = useState<GuestbookPhotoEntry[]>(() =>
    loadLocalGuestbookEntries()
  );
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(() => {
    const local = loadLocalGuestbookEntries();
    return local.length + 1;
  });
  const [newestEntryId, setNewestEntryId] = useState<string | null>(null);
  const [lightboxEntry, setLightboxEntry] = useState<GuestbookPhotoEntry | null>(
    null
  );
  const [lightboxOrigin, setLightboxOrigin] = useState<{
    dx: number;
    dy: number;
    scale: number;
  }>({ dx: 0, dy: 24, scale: 0.72 });

  const openLightboxFromElement = (
    entry: GuestbookPhotoEntry,
    el: HTMLElement | null
  ) => {
    if (el && typeof window !== 'undefined') {
      const rect = el.getBoundingClientRect();
      const targetW = Math.min(window.innerWidth - 40, 820);
      const dx = rect.left + rect.width / 2 - window.innerWidth / 2;
      const dy = rect.top + rect.height / 2 - window.innerHeight / 2;
      const scale = Math.max(0.18, Math.min(0.85, rect.width / targetW));
      setLightboxOrigin({ dx, dy, scale });
    } else {
      setLightboxOrigin({ dx: 0, dy: 24, scale: 0.72 });
    }
    setLightboxEntry(entry);
  };

  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightboxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animStartRef = useRef<number | null>(null);
  const latestElapsedRef = useRef<number>(0);

  const [todayLabel] = useState<string>(() => formatKoreaDate());

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start/stop camera automatically when on capture stage; redirect away silently if camera permission is denied/unavailable
  useEffect(() => {
    if (stage !== 'capture') {
      stopCamera();
      return;
    }

    let cancelled = false;
    const blockAccess = () => {
      if (cancelled) return;
      setCameraStatus('error');
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    };

    const connect = async () => {
      stopCamera();
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        blockAccess();
        return;
      }

      if (!cancelled) {
        setCameraStatus('starting');
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 960 },
            height: { ideal: 640 },
            aspectRatio: { ideal: 3 / 2 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => { });
        }
        if (!cancelled) {
          setCameraStatus('ready');
        }
      } catch {
        blockAccess();
      }
    };

    void connect();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stage, cameraRetryKey, stopCamera]);

  // Auto-focus message textarea immediately when entering compose stage
  useEffect(() => {
    if (stage === 'compose') {
      const id = window.setTimeout(() => {
        messageInputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [stage]);

  // Initialize lightweight heterotopia 6-filter engine
  useEffect(() => {
    const engine = new HeterotopiaFilterEngine(642, 428);
    filterEngineRef.current = engine;
    return () => {
      engine.dispose();
      filterEngineRef.current = null;
    };
  }, []);

  // Auto-reload /photo when a new deployment goes live (only while idle)
  const pendingReloadRef = useRef<boolean>(false);
  const isIdleForReload =
    stage === 'capture' &&
    countdown === null &&
    !submitting &&
    !archiveOpen &&
    lightboxEntry === null;
  const isIdleForReloadRef = useRef<boolean>(isIdleForReload);

  useEffect(() => {
    isIdleForReloadRef.current = isIdleForReload;
    if (isIdleForReload && pendingReloadRef.current) {
      window.location.reload();
    }
  }, [isIdleForReload]);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const currentVersion =
      typeof __APP_BUILD_VERSION__ === 'string' ? __APP_BUILD_VERSION__ : '';
    if (!currentVersion) return;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (data.version && data.version !== currentVersion) {
          if (isIdleForReloadRef.current) {
            window.location.reload();
          } else {
            pendingReloadRef.current = true;
          }
        }
      } catch {
        // Ignore transient network hiccups
      }
    };

    const id = window.setInterval(() => {
      void checkVersion();
    }, VERSION_POLL_MS);

    return () => window.clearInterval(id);
  }, []);

  // Load persisted photo guestbook entries from Vercel Blob on mount (+ live poll on /archive)
  const [loadingEntries, setLoadingEntries] = useState<boolean>(true);
  const refreshEntries = useCallback(async () => {
    const { entries: loaded, nextNumber } = await fetchGuestbookEntries();
    setEntries(loaded);
    setNextOrderNumber(nextNumber);
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchGuestbookEntries().then(({ entries: loaded, nextNumber }) => {
      if (!cancelled) {
        setEntries(loaded);
        setNextOrderNumber(nextNumber);
        setLoadingEntries(false);
      }
    });

    if (!archiveOpen) {
      return () => {
        cancelled = true;
      };
    }

    const pollId = window.setInterval(() => {
      void fetchGuestbookEntries().then(({ entries: loaded, nextNumber }) => {
        if (!cancelled) {
          setEntries(loaded);
          setNextOrderNumber(nextNumber);
        }
      });
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [archiveOpen]);

  const handleSelectFilter = (nextFilter: PhotoFilterId) => {
    setActiveFilter(nextFilter);
    activeFilterRef.current = nextFilter;
    filterEngineRef.current?.onFilterChange(nextFilter);
  };

  // Real-time 4:3 preview loop for capture stage
  useEffect(() => {
    if (stage !== 'capture') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (animStartRef.current === null) {
        animStartRef.current = now;
      }
      const elapsedSec = (now - animStartRef.current) * 0.001;
      latestElapsedRef.current = elapsedSec;

      const video = videoRef.current;
      const engine = filterEngineRef.current;
      const hasVideo =
        video &&
        engine &&
        cameraStatus === 'ready' &&
        video.readyState >= 2 &&
        video.videoWidth > 0;

      if (hasVideo) {
        engine.renderFrame(video, activeFilterRef.current);
      }

      renderExhibitionPhotoFrame(ctx, {
        source: hasVideo ? engine.canvas : null,
        sourceWidth: hasVideo ? engine.canvas.width : 0,
        sourceHeight: hasVideo ? engine.canvas.height : 0,
        mirror: false,
        grayscale: false,
        elapsedSec,
        monoliths,
        showCaption: true,
        orderNumber: nextOrderNumber,
        dateLabel: todayLabel,
        fastPreview: true,
      });
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [stage, cameraStatus, monoliths, nextOrderNumber, todayLabel]);

  // Keep frame animated in compose & done stages too, and update export canvas once on state change
  useEffect(() => {
    if (stage === 'capture' || !captured) return;

    // Paint full-res 1600x1200 export canvas once for crisp download/upload
    const exportCanvas = exportCanvasRef.current;
    if (exportCanvas) {
      const ectx = exportCanvas.getContext('2d');
      if (ectx) {
        renderExhibitionPhotoFrame(ectx, {
          source: captured.image,
          sourceWidth: captured.width,
          sourceHeight: captured.height,
          mirror: false,
          grayscale: false,
          elapsedSec: captured.frozenElapsedSec,
          monoliths,
          message,
          showCaption: true,
          orderNumber: nextOrderNumber,
          dateLabel: todayLabel,
        });
      }
    }

    // Keep preview canvas monoliths smoothly animating
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const pctx = previewCanvas.getContext('2d');
    if (!pctx) return;

    let rafId = 0;
    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (animStartRef.current === null) animStartRef.current = now;
      const elapsedSec = (now - animStartRef.current) * 0.001;
      latestElapsedRef.current = elapsedSec;
      renderExhibitionPhotoFrame(pctx, {
        source: captured.image,
        sourceWidth: captured.width,
        sourceHeight: captured.height,
        mirror: false,
        grayscale: false,
        elapsedSec,
        monoliths,
        message,
        showCaption: true,
        orderNumber: nextOrderNumber,
        dateLabel: todayLabel,
        fastPreview: true,
      });
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [stage, captured, monoliths, message, nextOrderNumber, todayLabel]);

  // Close lightbox or archive overlay on Escape key
  useEffect(() => {
    if (!lightboxEntry && !archiveOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxEntry) {
          setLightboxEntry(null);
        } else if (archiveOpen) {
          setArchiveOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxEntry, archiveOpen]);

  // Animate the monolith frame live when viewing any saved card in the lightbox
  useEffect(() => {
    if (!lightboxEntry) return;
    const canvas = lightboxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;
    const startMs = performance.now();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      // Crop exact inner 3:2 photo region from saved 4:3 framed card (proportional to natural size)
      const sourceCrop = {
        sx: (SCR_X / FRAME_W) * nw,
        sy: (SCR_Y / FRAME_H) * nh,
        sw: (SCR_W / FRAME_W) * nw,
        sh: (SCR_H / FRAME_H) * nh,
      };

      const tick = (now: number) => {
        if (cancelled) return;
        rafId = window.requestAnimationFrame(tick);
        const elapsedSec = (now - startMs) * 0.001;
        renderExhibitionPhotoFrame(ctx, {
          source: img,
          sourceWidth: nw,
          sourceHeight: nh,
          sourceCrop,
          mirror: false,
          grayscale: false,
          elapsedSec,
          monoliths,
          showCaption: false,
          fastPreview: true,
        });
      };
      rafId = window.requestAnimationFrame(tick);
    };
    img.src = lightboxEntry.imageDataUrl;

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [lightboxEntry, monoliths]);

  const triggerShutterFlash = () => {
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 720);
  };

  const captureFromVideo = useCallback(() => {
    const engine = filterEngineRef.current;
    const video = videoRef.current;
    if (!engine || !video || video.videoWidth === 0 || video.videoHeight === 0) {
      setScreenLightActive(false);
      return;
    }

    // Ensure latest filtered frame is painted before snapshotting
    engine.renderFrame(video, activeFilterRef.current);
    triggerShutterFlash();
    window.setTimeout(() => setScreenLightActive(false), 120);

    const img = new Image();
    img.onload = () => {
      setCaptured({
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        frozenElapsedSec: latestElapsedRef.current,
      });
      setStage('compose');
    };
    img.src = engine.canvas.toDataURL('image/png');
  }, []);

  // Fixed 3-second countdown shutter with physical xenon strobe burst
  const handleShutterClick = () => {
    if (cameraStatus !== 'ready') {
      setCameraRetryKey((k) => k + 1);
      return;
    }
    if (countdown !== null) return;
    setCountdown(SHUTTER_TIMER_SEC);
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    // Fire the strobe right before the shutter (~140ms before capture) like a real camera flash pre-burst + main burst
    let lightTimerId: number | null = null;
    if (countdown === 1) {
      lightTimerId = window.setTimeout(() => {
        setScreenLightActive(true);
      }, 860);
    }

    const id = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        captureFromVideo();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => {
      window.clearTimeout(id);
      if (lightTimerId !== null) window.clearTimeout(lightTimerId);
    };
  }, [countdown, captureFromVideo]);

  const handleRetake = () => {
    setCaptured(null);
    setShareFeedback('');
    setStage('capture');
  };

  const handleSubmitGuestbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captured || submitting) return;

    const exportCanvas = exportCanvasRef.current;
    if (!exportCanvas) return;

    const ctx = exportCanvas.getContext('2d');
    if (ctx) {
      renderExhibitionPhotoFrame(ctx, {
        source: captured.image,
        sourceWidth: captured.width,
        sourceHeight: captured.height,
        mirror: false,
        grayscale: false,
        elapsedSec: captured.frozenElapsedSec,
        monoliths,
        message,
        showCaption: true,
        orderNumber: nextOrderNumber,
        dateLabel: todayLabel,
      });
    }

    setSubmitting(true);
    try {
      const result = await submitPhotoToGuestbook({
        fullCanvas: exportCanvas,
        message,
        author: '',
        orderNumber: nextOrderNumber,
        filter: activeFilterRef.current,
        grayscale: false,
      });
      setEntries((prev) => [result.entry, ...prev]);
      setNextOrderNumber((n) => Math.max(n + 1, result.entry.orderNumber + 1));
      setNewestEntryId(result.entry.id);
      setLastSubmitSynced(result.remoteSynced);
      setStage('done');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const shared = await shareCanvasImage(canvas, message);
    if (!shared) {
      setShareFeedback('이 기기에서는 직접 공유를 지원하지 않습니다.');
      window.setTimeout(() => setShareFeedback(''), 2600);
    }
  };

  const handleResetAll = () => {
    setCaptured(null);
    setMessage('');
    setShareFeedback('');
    setStage('capture');
  };

  // Keep the page hidden until camera permission is granted (no error message if denied)
  const isBoothReady = stage !== 'capture' || cameraStatus === 'ready';

  return (
    <div
      className={`photo-page ${archiveOpen ? 'is-archive-open' : ''} ${
        !isBoothReady ? 'is-camera-pending' : ''
      }`}
    >
      {/* Hidden video stream & full-resolution export canvas */}
      <video
        ref={videoRef}
        className="photo-sr-media"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={exportCanvasRef}
        width={FRAME_W}
        height={FRAME_H}
        className="photo-sr-media"
        aria-hidden="true"
      />

      {/* Main Photo Booth (stays visible behind archive overlay) */}
      <main className="photo-booth">
        {/* Top-Right Minimal Archive Toggle Button */}
        <button
          type="button"
          className="photo-archive-trigger"
          onClick={() => {
            setArchiveOpen(true);
            void refreshEntries();
          }}
          aria-label="아카이브 열기"
        >
          <Images size={14} aria-hidden="true" />
          <span>ARCHIVE</span>
          {entries.length > 0 && (
            <span className="photo-archive-trigger__count">
              {entries.length}
            </span>
          )}
        </button>

        {/* Floating Registered Photo Cards Orbiting the Screen Edges */}
        {entries.length > 0 && (
          <aside
            className="photo-float-layer"
            aria-label="등록된 포토 방명록"
          >
            {entries.slice(0, EDGE_FLOAT_SLOTS.length).map((entry, idx) => {
              const slot = EDGE_FLOAT_SLOTS[idx];
              const isNewest = entry.id === newestEntryId;
              // Older entries (higher idx) progressively shrink & recede slightly in opacity
              const ageScale = Math.max(0.28, Math.pow(0.9, idx));
              const ageOpacity = Math.max(0.38, 0.88 - idx * 0.038);
              const style: React.CSSProperties = {
                top: slot.top,
                bottom: slot.bottom,
                left: slot.left,
                right: slot.right,
                zIndex: EDGE_FLOAT_SLOTS.length - idx,
                '--float-rot': `${slot.rotate}deg`,
                '--float-dx': `${slot.driftX}px`,
                '--float-dy': `${slot.driftY}px`,
                '--float-dur': `${slot.duration}s`,
                '--float-delay': `${slot.delay}s`,
                '--float-scale': Number(ageScale.toFixed(3)),
                '--float-opacity': Number(ageOpacity.toFixed(2)),
              } as React.CSSProperties;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`photo-float-card ${isNewest ? 'is-newest' : ''}`}
                  style={style}
                  onClick={(e) =>
                    openLightboxFromElement(entry, e.currentTarget)
                  }
                  aria-label="등록된 포토 방명록 보기"
                >
                  <img
                    src={entry.imageDataUrl}
                    alt={entry.message || '포토 방명록'}
                    loading="lazy"
                  />
                  <span className="photo-float-card__num">
                    {formatOrderNumber(entry.orderNumber)}
                  </span>
                  {entry.message && (
                    <span className="photo-float-card__caption">
                      <em>{entry.message}</em>
                    </span>
                  )}
                </button>
              );
            })}
          </aside>
        )}

        {/* Centered Single-Column Booth: 4:3 Card + Shutter Below */}
        <div className="photo-center-stack">
          <section
            className="photo-stage-col"
            aria-label="1컷 포토 프레임 미리보기"
          >
            <div className="photo-frame-shell">
              <canvas
                ref={previewCanvasRef}
                width={FRAME_W / 2}
                height={FRAME_H / 2}
                className="photo-frame-canvas"
              />

              {/* Fixed 3-second countdown overlay */}
              {countdown !== null && countdown > 0 && (
                <div className="photo-countdown" aria-live="assertive">
                  <span>{countdown}</span>
                </div>
              )}
            </div>
          </section>

          {/* Controls directly beneath the 4:3 card */}
          <section
            className="photo-controls-col"
            aria-label="촬영 및 방명록 작성"
          >
            {stage === 'capture' && (
              <div className="photo-capture-bar">
                <button
                  type="button"
                  className="photo-shutter-btn"
                  onClick={handleShutterClick}
                  disabled={countdown !== null}
                  aria-label="3초 타이머 촬영"
                >
                  <span className="photo-shutter-btn__inner">
                    {countdown !== null ? countdown : null}
                  </span>
                </button>

                <div
                  className="photo-filter-bar"
                  role="radiogroup"
                  aria-label="카메라 필터 선택"
                >
                  {PHOTO_FILTERS.map((filterId, idx) => (
                    <React.Fragment key={filterId}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={activeFilter === filterId}
                        className={`photo-filter-opt ${
                          activeFilter === filterId ? 'is-active' : ''
                        }`}
                        onClick={() => handleSelectFilter(filterId)}
                      >
                        {filterId}
                      </button>
                      {idx < PHOTO_FILTERS.length - 1 && (
                        <span className="photo-filter-sep" aria-hidden="true">
                          /
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {stage === 'compose' && (
              <form
                className="photo-panel photo-panel--compose"
                onSubmit={handleSubmitGuestbook}
              >
                <div className="photo-field">
                  <div className="photo-field__label-row">
                    <label htmlFor="guestbook-message" className="photo-label">
                      방명록 한마디
                    </label>
                    <span className="photo-counter">
                      {message.length} / 120
                    </span>
                  </div>
                  <textarea
                    ref={messageInputRef}
                    id="guestbook-message"
                    className="photo-textarea"
                    rows={2}
                    maxLength={120}
                    placeholder="전시를 보며 떠오른 생각이나 한마디를 남겨주세요."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="photo-action-row">
                  <button
                    type="button"
                    className="photo-btn photo-btn--ghost"
                    onClick={handleRetake}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>다시 찍기</span>
                  </button>
                  <button
                    type="submit"
                    className="photo-btn photo-btn--primary"
                    disabled={submitting}
                  >
                    <Check size={16} aria-hidden="true" />
                    <span>{submitting ? '등록 중…' : '방명록 등록하기'}</span>
                  </button>
                </div>
              </form>
            )}

            {stage === 'done' && (
              <div className="photo-panel photo-panel--done">
                <div className="photo-done-head">
                  <span className="photo-kicker photo-kicker--done">
                    <Check size={13} aria-hidden="true" />
                    {lastSubmitSynced
                      ? 'GUESTBOOK SYNCED'
                      : '방명록에 등록되었습니다'}
                  </span>
                </div>

                <div className="photo-action-row">
                  <button
                    type="button"
                    className="photo-btn photo-btn--primary"
                    onClick={handleResetAll}
                  >
                    <Camera size={15} aria-hidden="true" />
                    <span>한 장 더 찍기</span>
                  </button>
                  <button
                    type="button"
                    className="photo-btn photo-btn--secondary"
                    onClick={() => void handleShare()}
                  >
                    <Share2 size={15} aria-hidden="true" />
                    <span>공유하기</span>
                  </button>
                </div>

                {integration.returnUrl && (
                  <a
                    href={integration.returnUrl}
                    className="photo-btn photo-btn--secondary"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    <span>방명록 사이트로 돌아가기</span>
                  </a>
                )}

                {shareFeedback && (
                  <p className="photo-toast" role="status">
                    {shareFeedback}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Translucent Archive Overlay over the live Photo Booth background */}
      {archiveOpen && (
        <div
          className="photo-archive-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="포토 방명록 아카이브"
          onClick={() => setArchiveOpen(false)}
        >
          <div
            className="photo-gallery-view photo-archive-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="photo-gallery-head">
              <div>
                <span className="photo-kicker">
                  OWNHOMEOWN.COM / ARCHIVE · {entries.length} CUTS
                </span>
                <h1 className="photo-title">포토 방명록 아카이브</h1>
              </div>
              <div className="photo-gallery-head__actions">
                <button
                  type="button"
                  className="photo-btn photo-btn--ghost photo-btn--compact"
                  onClick={() => void refreshEntries()}
                  aria-label="새로고침"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  <span>새로고침</span>
                </button>
                <button
                  type="button"
                  className="photo-btn photo-btn--primary photo-btn--compact"
                  onClick={() => setArchiveOpen(false)}
                  aria-label="아카이브 닫기"
                >
                  <X size={15} aria-hidden="true" />
                  <span>닫기</span>
                </button>
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="photo-empty">
                <p>
                  {loadingEntries
                    ? '포토 방명록을 불러오는 중입니다…'
                    : '아직 등록된 포토 방명록이 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="photo-gallery-grid">
                {entries.map((entry) => (
                  <article key={entry.id} className="photo-card">
                    <button
                      type="button"
                      className="photo-card__media"
                      onClick={(e) =>
                        openLightboxFromElement(entry, e.currentTarget)
                      }
                      aria-label="포토 방명록 크게 보기"
                    >
                      <img
                        src={entry.imageDataUrl}
                        alt={entry.message || '포토 방명록'}
                        loading="lazy"
                      />
                    </button>
                    <div className="photo-card__meta">
                      <div className="photo-card__row">
                        <span className="photo-card__num">
                          {formatOrderNumber(entry.orderNumber)}
                        </span>
                        <span className="photo-card__date">
                          {formatKoreaDate(entry.createdAt)}
                        </span>
                      </div>
                      {entry.message && (
                        <p className="photo-card__msg">{entry.message}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-viewport physical screen-fill light for illuminating subject during capture */}
      {(screenLightActive || flashActive) && (
        <div
          className={`photo-screen-light ${flashActive ? 'is-decaying' : ''}`}
          aria-hidden="true"
        />
      )}

      {/* Lightbox Modal for Guestbook Entry */}
      {lightboxEntry && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="포토 방명록 상세"
          onClick={() => setLightboxEntry(null)}
        >
          <div
            className="photo-lightbox__box"
            style={
              {
                '--origin-dx': `${lightboxOrigin.dx}px`,
                '--origin-dy': `${lightboxOrigin.dy}px`,
                '--origin-scale': lightboxOrigin.scale,
              } as React.CSSProperties
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="photo-lightbox__close"
              onClick={() => setLightboxEntry(null)}
              aria-label="닫기"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <canvas
              ref={lightboxCanvasRef}
              width={FRAME_W / 2}
              height={FRAME_H / 2}
              className="photo-lightbox__img"
              aria-label={lightboxEntry.message || '포토 방명록'}
            />

            <div className="photo-lightbox__info">
              {lightboxEntry.message && (
                <p className="photo-lightbox__msg">{lightboxEntry.message}</p>
              )}
              <div className="photo-lightbox__footer-row">
                <span className="photo-card__date">
                  {formatOrderNumber(lightboxEntry.orderNumber)} ·{' '}
                  {formatKoreaDate(lightboxEntry.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
