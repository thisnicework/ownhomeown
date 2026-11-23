import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  Download,
  ExternalLink,
  FlipHorizontal2,
  ImagePlus,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { GongJuTitleLockup } from './TitleLockup';
import {
  createFrameMonolithSet,
  FRAME_H,
  FRAME_W,
  renderExhibitionPhotoFrame,
  type FrameMonolithSet,
} from '../lib/photoFrameRenderer';
import {
  deleteLocalGuestbookEntry,
  downloadCanvasAsPng,
  formatKoreaDate,
  getGuestbookIntegrationConfig,
  loadLocalGuestbookEntries,
  shareCanvasImage,
  submitPhotoToGuestbook,
  type GuestbookPhotoEntry,
} from '../lib/guestbookBridge';
import './PhotoGuestbook.css';

type BoothStage = 'capture' | 'compose' | 'done';
type ActiveTab = 'booth' | 'gallery';
type FacingMode = 'user' | 'environment';

interface CapturedPhoto {
  image: HTMLImageElement;
  width: number;
  height: number;
  /** Frozen elapsed time so monolith frame stays locked unless user randomizes */
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
  { top: '10%', left: '2%', rotate: -3.2, duration: 7.4, delay: 0.0, driftX: 8, driftY: -12, scale: 1.0 },
  { top: '12%', right: '2%', rotate: 2.8, duration: 8.1, delay: -1.6, driftX: -9, driftY: -10, scale: 0.98 },
  { top: '44%', left: '1.5%', rotate: 2.1, duration: 8.8, delay: -2.9, driftX: 7, driftY: -14, scale: 0.94 },
  { top: '46%', right: '1.5%', rotate: -2.3, duration: 8.3, delay: -4.0, driftX: -7, driftY: 13, scale: 0.94 },
  { bottom: '6%', left: '2.2%', rotate: 2.5, duration: 7.8, delay: -2.2, driftX: 10, driftY: 11, scale: 0.96 },
  { bottom: '7%', right: '2.2%', rotate: -2.9, duration: 8.6, delay: -0.9, driftX: -8, driftY: 12, scale: 1.0 },
  { bottom: '4%', left: '18%', rotate: -1.8, duration: 7.9, delay: -1.2, driftX: 9, driftY: -9, scale: 0.88 },
  { bottom: '4%', right: '18%', rotate: 2.1, duration: 8.4, delay: -2.8, driftX: -9, driftY: -10, scale: 0.88 },
  { top: '7.5%', left: '17%', rotate: 1.6, duration: 8.8, delay: -3.7, driftX: 8, driftY: 8, scale: 0.85 },
  { top: '7.5%', right: '17%', rotate: -1.7, duration: 9.2, delay: -0.5, driftX: -8, driftY: 9, scale: 0.85 },
];

const SHUTTER_TIMER_SEC = 3;

export const PhotoGuestbookPage: React.FC = () => {
  const integration = useMemo(() => getGuestbookIntegrationConfig(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('booth');
  const [stage, setStage] = useState<BoothStage>('capture');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [mirror, setMirror] = useState<boolean>(true);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'starting' | 'ready' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraRetryKey, setCameraRetryKey] = useState<number>(0);

  // Booth & frame state
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [monoliths, setMonoliths] = useState<FrameMonolithSet>(() =>
    createFrameMonolithSet(20261125)
  );
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);

  // Guestbook compose state (message only, no nickname)
  const [message, setMessage] = useState<string>('');
  const [showCaption, setShowCaption] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmitSynced, setLastSubmitSynced] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');

  // Guestbook gallery state
  const [entries, setEntries] = useState<GuestbookPhotoEntry[]>(() =>
    loadLocalGuestbookEntries()
  );
  const [newestEntryId, setNewestEntryId] = useState<string | null>(null);
  const [lightboxEntry, setLightboxEntry] = useState<GuestbookPhotoEntry | null>(
    null
  );

  // Canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // Start/stop camera automatically when on capture stage
  useEffect(() => {
    if (activeTab !== 'booth' || stage !== 'capture') {
      stopCamera();
      return;
    }

    let cancelled = false;
    const connect = async () => {
      stopCamera();
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        if (!cancelled) {
          setCameraStatus('error');
          setCameraError(
            '이 브라우저에서는 카메라를 지원하지 않습니다. 앨범에서 사진을 불러와 주세요.'
          );
        }
        return;
      }

      if (!cancelled) {
        setCameraStatus('starting');
        setCameraError('');
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1500 },
            height: { ideal: 1000 },
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
          await video.play().catch(() => {});
        }
        if (!cancelled) {
          setCameraStatus('ready');
        }
      } catch (err) {
        if (cancelled) return;
        setCameraStatus('error');
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? '카메라 권한이 거부되었습니다. 권한을 허용하거나 앨범에서 사진을 선택해 주세요.'
            : '카메라를 연결할 수 없습니다. 앨범에서 사진을 불러와 바로 프레임을 적용할 수 있습니다.';
        setCameraError(msg);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [activeTab, stage, facingMode, cameraRetryKey, stopCamera]);

  // Auto-focus message textarea immediately when entering compose stage
  useEffect(() => {
    if (activeTab === 'booth' && stage === 'compose') {
      const id = window.setTimeout(() => {
        messageInputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [activeTab, stage]);

  // Real-time 4:3 preview loop for capture stage
  useEffect(() => {
    if (activeTab !== 'booth' || stage !== 'capture') return;
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
      const hasVideo =
        video &&
        cameraStatus === 'ready' &&
        video.readyState >= 2 &&
        video.videoWidth > 0;

      renderExhibitionPhotoFrame(ctx, {
        source: hasVideo ? video : null,
        sourceWidth: hasVideo ? video.videoWidth : 0,
        sourceHeight: hasVideo ? video.videoHeight : 0,
        mirror,
        grayscale,
        elapsedSec,
        monoliths,
        showCaption: false,
      });
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeTab, stage, cameraStatus, mirror, grayscale, monoliths]);

  // Render static high-res 1600x1200 preview when composing or done
  useEffect(() => {
    if (activeTab !== 'booth' || stage === 'capture' || !captured) return;

    const drawTo = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderExhibitionPhotoFrame(ctx, {
        source: captured.image,
        sourceWidth: captured.width,
        sourceHeight: captured.height,
        mirror,
        grayscale,
        elapsedSec: captured.frozenElapsedSec,
        monoliths,
        message,
        showCaption,
        dateLabel: todayLabel,
      });
    };

    drawTo(previewCanvasRef.current);
    drawTo(exportCanvasRef.current);
  }, [
    activeTab,
    stage,
    captured,
    mirror,
    grayscale,
    monoliths,
    message,
    showCaption,
    todayLabel,
  ]);

  const regenerateMonoliths = () => {
    const nextSeed = Math.floor(Math.random() * 0xffffffff);
    setMonoliths(createFrameMonolithSet(nextSeed));
    if (captured) {
      setCaptured({ ...captured, frozenElapsedSec: Math.random() * 14 });
    }
  };

  const triggerShutterFlash = () => {
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 220);
  };

  const captureFromVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    triggerShutterFlash();
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    const sctx = snap.getContext('2d');
    if (!sctx) return;
    sctx.drawImage(video, 0, 0, snap.width, snap.height);

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
    img.src = snap.toDataURL('image/png');
  }, []);

  // Fixed 3-second countdown shutter
  const handleShutterClick = () => {
    if (cameraStatus !== 'ready') {
      fileInputRef.current?.click();
      return;
    }
    if (countdown !== null) return;
    setCountdown(SHUTTER_TIMER_SEC);
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const id = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        captureFromVideo();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [countdown, captureFromVideo]);

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setMirror(false);
        setCaptured({
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          frozenElapsedSec: latestElapsedRef.current || 1.2,
        });
        setStage('compose');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFlipCamera = () => {
    const next: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setMirror(next === 'user');
  };

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
        mirror,
        grayscale,
        elapsedSec: captured.frozenElapsedSec,
        monoliths,
        message,
        showCaption,
        dateLabel: todayLabel,
      });
    }

    setSubmitting(true);
    try {
      const result = await submitPhotoToGuestbook({
        fullCanvas: exportCanvas,
        message,
        author: '',
        grayscale,
      });
      setEntries((prev) => [result.entry, ...prev]);
      setNewestEntryId(result.entry.id);
      setLastSubmitSynced(result.remoteSynced);
      setStage('done');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    downloadCanvasAsPng(canvas, `ownhomeown-photo-${Date.now()}.png`);
    setShareFeedback('1600×1200 이미지를 저장했습니다.');
    window.setTimeout(() => setShareFeedback(''), 2600);
  };

  const handleShare = async () => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const shared = await shareCanvasImage(canvas, message);
    if (!shared) {
      handleDownload();
    }
  };

  const handleDeleteEntry = (id: string) => {
    const next = deleteLocalGuestbookEntry(id);
    setEntries(next);
    if (lightboxEntry?.id === id) {
      setLightboxEntry(null);
    }
  };

  const handleResetAll = () => {
    setCaptured(null);
    setMessage('');
    setShowCaption(true);
    setShareFeedback('');
    setStage('capture');
    setActiveTab('booth');
  };

  return (
    <div className="photo-page">
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="photo-sr-media"
        onChange={handleUploadFile}
      />

      {/* Minimal Architectural Header */}
      <header className="photo-header">
        <div className="photo-header__left">
          <a href="/" className="photo-header__brand" aria-label="전시 메인으로">
            <GongJuTitleLockup size="nav" tone="light" />
          </a>
          <span className="photo-header__tag">PHOTO / 1-CUT</span>
        </div>

        <nav className="photo-header__nav" aria-label="포토 방명록 메뉴">
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === 'booth' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('booth')}
          >
            <Camera size={14} aria-hidden="true" />
            <span>촬영</span>
          </button>
          <button
            type="button"
            className={`photo-tab-btn ${activeTab === 'gallery' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>방명록 ({entries.length})</span>
          </button>
          {integration.returnUrl && (
            <a
              href={integration.returnUrl}
              className="photo-tab-btn photo-tab-btn--ext"
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>방명록 사이트</span>
            </a>
          )}
        </nav>
      </header>

      {/* Main Content */}
      {activeTab === 'booth' ? (
        <main className="photo-booth">
          {/* Floating Registered Photo Cards Orbiting the Screen Edges */}
          {entries.length > 0 && (
            <aside
              className="photo-float-layer"
              aria-label="등록된 포토 방명록"
            >
              {entries.slice(0, EDGE_FLOAT_SLOTS.length).map((entry, idx) => {
                const slot = EDGE_FLOAT_SLOTS[idx];
                const isNewest = entry.id === newestEntryId;
                const style: React.CSSProperties = {
                  top: slot.top,
                  bottom: slot.bottom,
                  left: slot.left,
                  right: slot.right,
                  '--float-rot': `${slot.rotate}deg`,
                  '--float-dx': `${slot.driftX}px`,
                  '--float-dy': `${slot.driftY}px`,
                  '--float-dur': `${slot.duration}s`,
                  '--float-delay': `${slot.delay}s`,
                  '--float-scale': slot.scale,
                } as React.CSSProperties;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`photo-float-card ${isNewest ? 'is-newest' : ''}`}
                    style={style}
                    onClick={() => setLightboxEntry(entry)}
                    aria-label="등록된 포토 방명록 보기"
                  >
                    <img
                      src={entry.imageDataUrl}
                      alt={entry.message || '포토 방명록'}
                      loading="lazy"
                    />
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

          {/* Centered Single-Column Booth: 4:3 Card on Top, Shutter / Compose Directly Below */}
          <div className="photo-center-stack">
            <section
              className="photo-stage-col"
              aria-label="1컷 포토 프레임 미리보기"
            >
              <div className="photo-frame-shell">
                <canvas
                  ref={previewCanvasRef}
                  width={FRAME_W}
                  height={FRAME_H}
                  className="photo-frame-canvas"
                />

                {/* Fixed 3-second countdown overlay */}
                {countdown !== null && countdown > 0 && (
                  <div className="photo-countdown" aria-live="assertive">
                    <span>{countdown}</span>
                  </div>
                )}

                {/* Shutter flash */}
                {flashActive && (
                  <div className="photo-flash" aria-hidden="true" />
                )}

                {/* Camera fallback overlay */}
                {stage === 'capture' && cameraStatus === 'error' && (
                  <div className="photo-camera-fallback">
                    <p className="photo-camera-fallback__title">
                      CAMERA UNAVAILABLE
                    </p>
                    <p className="photo-camera-fallback__desc">{cameraError}</p>
                    <div className="photo-camera-fallback__actions">
                      <button
                        type="button"
                        className="photo-btn photo-btn--primary photo-btn--compact"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus size={15} aria-hidden="true" />
                        <span>앨범에서 사진 선택</span>
                      </button>
                      <button
                        type="button"
                        className="photo-btn photo-btn--ghost photo-btn--compact"
                        onClick={() => setCameraRetryKey((k) => k + 1)}
                      >
                        <RefreshCw size={14} aria-hidden="true" />
                        <span>카메라 다시 연결</span>
                      </button>
                    </div>
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
                  <div className="photo-shutter-dock">
                    <button
                      type="button"
                      className="photo-icon-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="앨범에서 사진 불러오기"
                      title="앨범에서 사진 불러오기"
                    >
                      <ImagePlus size={18} aria-hidden="true" />
                      <span>앨범</span>
                    </button>

                    <button
                      type="button"
                      className="photo-shutter-btn"
                      onClick={handleShutterClick}
                      disabled={countdown !== null}
                      aria-label="3초 타이머 1컷 촬영"
                    >
                      <span className="photo-shutter-btn__inner">
                        {countdown !== null ? countdown : '3s'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="photo-icon-btn"
                      onClick={handleFlipCamera}
                      aria-label="전후면 카메라 전환"
                      title="전후면 카메라 전환"
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                      <span>전환</span>
                    </button>
                  </div>

                  <div className="photo-chip-row">
                    <button
                      type="button"
                      className={`photo-chip ${grayscale ? 'is-active' : ''}`}
                      onClick={() => setGrayscale((g) => !g)}
                    >
                      <span>{grayscale ? '흑백' : '컬러'}</span>
                    </button>
                    <button
                      type="button"
                      className={`photo-chip ${mirror ? 'is-active' : ''}`}
                      onClick={() => setMirror((m) => !m)}
                    >
                      <FlipHorizontal2 size={13} aria-hidden="true" />
                      <span>좌우 반전</span>
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={regenerateMonoliths}
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>프레임 변경</span>
                    </button>
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

                  <div className="photo-chip-row">
                    <button
                      type="button"
                      className={`photo-chip ${showCaption ? 'is-active' : ''}`}
                      onClick={() => setShowCaption((v) => !v)}
                    >
                      <span>사진에 글 {showCaption ? '표시' : '숨김'}</span>
                    </button>
                    <button
                      type="button"
                      className={`photo-chip ${grayscale ? 'is-active' : ''}`}
                      onClick={() => setGrayscale((g) => !g)}
                    >
                      <span>{grayscale ? '흑백' : '컬러'}</span>
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={regenerateMonoliths}
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>프레임 변경</span>
                    </button>
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
                      onClick={handleDownload}
                    >
                      <Download size={16} aria-hidden="true" />
                      <span>이미지 저장</span>
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

                  <div className="photo-action-row">
                    <button
                      type="button"
                      className="photo-btn photo-btn--ghost"
                      onClick={() => setActiveTab('gallery')}
                    >
                      <BookOpen size={15} aria-hidden="true" />
                      <span>방명록 보기</span>
                    </button>
                    <button
                      type="button"
                      className="photo-btn photo-btn--ghost"
                      onClick={handleResetAll}
                    >
                      <Camera size={15} aria-hidden="true" />
                      <span>한 장 더 찍기</span>
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
      ) : (
        /* Guestbook Wall Archive */
        <main className="photo-gallery-view">
          <div className="photo-gallery-head">
            <div>
              <span className="photo-kicker">OWNHOMEOWN.COM / PHOTO</span>
              <h1 className="photo-title">포토 방명록 아카이브</h1>
            </div>
            <button
              type="button"
              className="photo-btn photo-btn--primary photo-btn--compact"
              onClick={handleResetAll}
            >
              <Camera size={15} aria-hidden="true" />
              <span>새 1컷 남기기</span>
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="photo-empty">
              <p>아직 등록된 포토 방명록이 없습니다.</p>
              <button
                type="button"
                className="photo-btn photo-btn--primary"
                onClick={handleResetAll}
              >
                <Camera size={16} aria-hidden="true" />
                <span>첫 번째 1컷 남기기</span>
              </button>
            </div>
          ) : (
            <div className="photo-gallery-grid">
              {entries.map((entry) => (
                <article key={entry.id} className="photo-card">
                  <button
                    type="button"
                    className="photo-card__media"
                    onClick={() => setLightboxEntry(entry)}
                    aria-label="포토 방명록 크게 보기"
                  >
                    <img
                      src={entry.imageDataUrl}
                      alt={entry.message || '포토 방명록'}
                      loading="lazy"
                    />
                  </button>
                  <div className="photo-card__meta">
                    {entry.message && (
                      <p className="photo-card__msg">{entry.message}</p>
                    )}
                    <span className="photo-card__date">
                      {formatKoreaDate(entry.createdAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="photo-gallery-footer">
            <a href="/" className="photo-back-link">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>⟪공과 주⟫ 전시 메인으로 돌아가기</span>
            </a>
          </div>
        </main>
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

            <img
              src={lightboxEntry.imageDataUrl}
              alt={lightboxEntry.message || '포토 방명록'}
              className="photo-lightbox__img"
            />

            <div className="photo-lightbox__info">
              {lightboxEntry.message && (
                <p className="photo-lightbox__msg">{lightboxEntry.message}</p>
              )}
              <div className="photo-lightbox__footer-row">
                <span className="photo-card__date">
                  {formatKoreaDate(lightboxEntry.createdAt)}
                </span>
                <div className="photo-lightbox__actions">
                  <a
                    href={lightboxEntry.imageDataUrl}
                    download={`ownhomeown-${lightboxEntry.id}.jpg`}
                    className="photo-btn photo-btn--secondary photo-btn--compact"
                  >
                    <Download size={14} aria-hidden="true" />
                    <span>저장</span>
                  </a>
                  <button
                    type="button"
                    className="photo-btn photo-btn--ghost photo-btn--compact"
                    onClick={() => handleDeleteEntry(lightboxEntry.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
