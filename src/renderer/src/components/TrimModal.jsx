import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

const formatTime = (secs) => {
    if (!Number.isFinite(secs)) return "0:00.0";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${ms}`;
};

export default function TrimModal({ track, onConfirm, onCancel }) {
    const [duration, setDuration] = useState(0);
    const [start, setStart] = useState(track.trim?.start || 0);
    const [end, setEnd] = useState(track.trim?.end || 0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    const previewHowl = useRef(null);
    const progressBarRef = useRef(null);
    const draggingRef = useRef(null);
    const stopTimerRef = useRef(null);

    // Load Audio
    useEffect(() => {
        setIsLoading(true);
        const sound = new Howl({
            src: [`media://${track.path}`],
            html5: true, // STREAMING MODE (Prevents Freeze)
            onload: () => {
                const dur = sound.duration();
                setDuration(dur);
                if (!track.trim) setEnd(dur);
                setIsLoading(false);
            },
            onloaderror: (id, err) => {
                console.error("TrimModal Load Error:", err);
                setIsLoading(false);
            },
            onend: () => setIsPlaying(false),
            onstop: () => setIsPlaying(false)
        });
        previewHowl.current = sound;

        return () => {
            sound.stop();
            sound.unload();
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        };
    }, [track.path]);

    // Timer Ref for manual stop
    const handlePreview = () => {
        if (!previewHowl.current) return;
        const sound = previewHowl.current;

        if (isPlaying) {
            sound.stop();
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            setIsPlaying(false);
            return;
        }

        // Manual Slice Preview (Seek -> Play -> Timeout Stop)
        sound.stop();
        sound.seek(start);
        sound.play();
        setIsPlaying(true);

        // Schedule Stop
        const durationMs = (end - start) * 1000;
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

        stopTimerRef.current = setTimeout(() => {
            sound.fade(sound.volume(), 0, 100); // Smooth fade out
            sound.once('fade', () => {
                sound.stop();
                sound.volume(1); // Reset volume
                setIsPlaying(false);
            });
        }, durationMs);
    };

    // Slider Drag Logic
    const handleMouseDown = (e, type) => {
        e.preventDefault();
        draggingRef.current = type;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!draggingRef.current || !progressBarRef.current) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        let percentage = Math.max(0, Math.min(1, offsetX / rect.width));
        let newTime = percentage * duration;

        if (draggingRef.current === 'start') {
            newTime = Math.min(newTime, end - 0.5); // Min 0.5s gap
            setStart(Math.max(0, newTime));
        } else {
            newTime = Math.max(newTime, start + 0.5);
            setEnd(Math.min(duration, newTime));
        }
    };

    const handleMouseUp = () => {
        draggingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Percentages for UI
    const startP = duration > 0 ? (start / duration) * 100 : 0;
    const endP = duration > 0 ? (end / duration) * 100 : 100;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '600px', maxWidth: '90vw' }}>
                <h2 style={{ fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>
                    TRIM AUDIO
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '30px' }}>
                    {track.name}
                </div>

                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Loading Audio Formats...</div>
                ) : (
                    <>
                        {/* Custom Timeline Slider */}
                        <div
                            className="trim-track"
                            ref={progressBarRef}
                            style={{
                                position: 'relative',
                                height: '50px',
                                background: '#1a1a1a',
                                borderRadius: '6px',
                                marginBottom: '30px',
                                cursor: 'crosshair',
                                border: '1px solid #333'
                            }}
                        >
                            {/* Selected Region (Active) */}
                            <div style={{
                                position: 'absolute',
                                left: `${startP}%`,
                                width: `${endP - startP}%`,
                                height: '100%',
                                background: 'rgba(45, 212, 191, 0.15)',
                                pointerEvents: 'none'
                            }} />

                            {/* Start Handle */}
                            <div
                                onMouseDown={(e) => handleMouseDown(e, 'start')}
                                style={{
                                    position: 'absolute',
                                    left: `${startP}%`,
                                    height: '100%',
                                    width: '12px',
                                    background: '#2dd4bf',
                                    transform: 'translateX(-50%)',
                                    cursor: 'ew-resize',
                                    borderRadius: '4px',
                                    zIndex: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <div style={{ width: '2px', height: '20px', background: 'rgba(0,0,0,0.3)' }}></div>
                            </div>

                            {/* End Handle */}
                            <div
                                onMouseDown={(e) => handleMouseDown(e, 'end')}
                                style={{
                                    position: 'absolute',
                                    left: `${endP}%`,
                                    height: '100%',
                                    width: '12px',
                                    background: '#cf6679',
                                    transform: 'translateX(-50%)',
                                    cursor: 'ew-resize',
                                    borderRadius: '4px',
                                    zIndex: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <div style={{ width: '2px', height: '20px', background: 'rgba(0,0,0,0.3)' }}></div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', background: '#111', padding: '15px', borderRadius: '8px' }}>
                            {/* Start Time Controls */}
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}>START</label>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: '#2dd4bf' }}>{formatTime(start)}</div>
                                <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                                    <button onClick={() => setStart(Math.max(0, start - 0.1))} className="btn-micro">-</button>
                                    <button onClick={() => setStart(Math.min(end - 0.5, start + 0.1))} className="btn-micro">+</button>
                                </div>
                            </div>

                            {/* Preview Button */}
                            <button
                                onClick={handlePreview}
                                className={`btn-preview ${isPlaying ? 'playing' : ''}`}
                            >
                                {isPlaying ? 'STOP' : '▶ PREVIEW'}
                            </button>

                            {/* End Time Controls */}
                            <div style={{ textAlign: 'right' }}>
                                <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}>END</label>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: '#cf6679' }}>{formatTime(end)}</div>
                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                    <button onClick={() => setEnd(Math.max(start + 0.5, end - 0.1))} className="btn-micro">-</button>
                                    <button onClick={() => setEnd(Math.min(duration, end + 0.1))} className="btn-micro">+</button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="action-area" style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button className="btn-text" onClick={onCancel}>Cancel</button>
                            <button
                                className="btn-outline"
                                onClick={() => onConfirm({ start, end })}
                                style={{ width: '150px' }}
                            >
                                Apply Trim
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .btn-micro {
                    background: #222;
                    border: 1px solid #333;
                    color: #888;
                    width: 24px; height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.9rem;
                }
                .btn-micro:hover {
                    background: #333;
                    color: #fff;
                    border-color: #555;
                }
                .btn-preview {
                    height: 40px;
                    padding: 0 24px;
                    border-radius: 20px;
                    background: #222;
                    border: 1px solid #444;
                    color: #fff;
                    cursor: pointer;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    transition: all 0.2s;
                }
                .btn-preview:hover {
                    background: #333;
                    border-color: #666;
                }
                .btn-preview.playing {
                    background: #2dd4bf;
                    border-color: #2dd4bf;
                    color: #000;
                }
            `}</style>
        </div>
    );
}
