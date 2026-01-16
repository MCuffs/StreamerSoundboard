import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

// Policy Constants
const POLICY = {
    EXCLUSIVE: 'A', // Stop previous, play new
    MIX: 'B',       // Play parallel
    QUEUE: 'C'      // Queue
};

import VirtualKeyboard from './components/VirtualKeyboard';
import TrimModal from './components/TrimModal';
import Visualizer from './components/Visualizer';
import ReactionSettings from './components/ReactionSettings';

function App() {
    const [tracks, setTracks] = useState([]);
    const [settings, setSettings] = useState({
        masterVolume: 100,
        policy: POLICY.EXCLUSIVE,
        outputDeviceId: 'default'
    });
    const [playingIds, setPlayingIds] = useState(new Set());
    const [queue, setQueue] = useState([]);
    const [outputs, setOutputs] = useState([]);

    // Modal State
    const [editingTrackId, setEditingTrackId] = useState(null);
    const [editingTrimTrackId, setEditingTrimTrackId] = useState(null);
    const [showReactions, setShowReactions] = useState(false);

    // Storage for Howl instances: { [trackId]: Howl }
    const howlsRef = useRef({});

    // --- Persistence Logic ---
    const isLoadedRef = useRef(false);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            if (window.electronAPI) {
                const savedTracks = await window.electronAPI.getStore('tracks');
                const savedSettings = await window.electronAPI.getStore('settings');
                if (savedTracks) setTracks(savedTracks);
                if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
                isLoadedRef.current = true;
            }
        };
        loadData();
    }, []);

    // Save Tracks
    useEffect(() => {
        if (!isLoadedRef.current) return;
        if (window.electronAPI) {
            window.electronAPI.setStore('tracks', tracks);

            // Re-register hotkeys
            tracks.forEach(t => {
                if (t.hotkey) {
                    window.electronAPI.unregisterHotkey(t.hotkey);
                    window.electronAPI.registerHotkey(t.hotkey, () => playTrack(t.id));
                }
            });
        }
    }, [tracks]);

    // Save Settings
    useEffect(() => {
        if (!isLoadedRef.current) return;
        if (window.electronAPI) {
            window.electronAPI.setStore('settings', settings);
        }
    }, [settings]);

    // Audio Output
    useEffect(() => {
        if (Howler.ctx && Howler.ctx.setSinkId && settings.outputDeviceId) {
            const sinkId = settings.outputDeviceId === 'default' ? '' : settings.outputDeviceId;

            Howler.ctx.setSinkId(sinkId)
                .then(() => console.log('Audio Device Set:', sinkId))
                .catch(err => console.warn("Failed to set output device:", err));
        }
    }, [settings.outputDeviceId]);

    // Master Volume
    useEffect(() => {
        Howler.volume(settings.masterVolume / 100);
    }, [settings.masterVolume]);

    // File Drop
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);

        const newTracks = files
            .filter(f => f.type.startsWith('audio/') || f.name.endsWith('.mp3'))
            .map(f => ({
                id: uuidv4(),
                name: f.name.replace(/\.[^/.]+$/, ""),
                path: f.path,
                hotkey: '',
                volume: 100,
                trim: null
            }));

        setTracks(prev => [...prev, ...newTracks]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleTrackEnd = (id) => {
        setPlayingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };


    // -- REF BASED STATE ACCESS (Fixes Closure Stale State) --
    const tracksRef = useRef(tracks);
    const settingsRef = useRef(settings);

    useEffect(() => { tracksRef.current = tracks; }, [tracks]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const playTrack = useCallback((id) => {
        const track = tracksRef.current.find(t => t.id === id);
        if (!track) return;

        const currentSettings = settingsRef.current;

        // Policy Check
        if (currentSettings.policy === POLICY.EXCLUSIVE) {
            Object.values(howlsRef.current).forEach(h => {
                if (h.playing()) h.fade(h.volume(), 0, 300).once('fade', () => { h.stop(); h.volume(track.volume / 100); });
            });
            setPlayingIds(new Set());
        }

        // Toggle logic
        if (howlsRef.current[id] && howlsRef.current[id].playing()) {
            const sound = howlsRef.current[id];
            sound.fade(sound.volume(), 0, 300);
            sound.once('fade', () => {
                sound.stop();
                sound.volume(track.volume / 100);
                handleTrackEnd(id);
            });
            return;
        }

        if (howlsRef.current[id]) {
            howlsRef.current[id].unload();
        }

        const options = {
            src: [`media://${track.path}`],
            html5: true,
            volume: track.volume / 100,
            onend: () => handleTrackEnd(id),
            onstop: () => handleTrackEnd(id),
            onloaderror: (id, err) => console.error('Load Error:', id, err)
        };

        if (track.trim) {
            const duration = (track.trim.end - track.trim.start) * 1000;
            options.sprite = {
                'cut': [track.trim.start * 1000, duration]
            };
        }

        const sound = new Howl(options);
        howlsRef.current[id] = sound;

        if (track.trim) sound.play('cut');
        else sound.play();

        setPlayingIds(prev => new Set(prev).add(id));
    }, []);


    // Save Tracks & Register Hotkeys
    useEffect(() => {
        if (!isLoadedRef.current) return;
        if (window.electronAPI) {
            window.electronAPI.setStore('tracks', tracks);

            // Register Hotkeys via IPC
            // We only need to register the keys. The Main process listens and sends a signal back.
            // In App.jsx, we listen to that signal.
            tracks.forEach(t => {
                if (t.hotkey) {
                    window.electronAPI.unregisterHotkey(t.hotkey);
                    window.electronAPI.registerHotkey(t.hotkey);
                }
            });
        }
    }, [tracks]);

    // IPC Listener for Hotkeys (Global)
    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onHotkeyTriggered((accelerator) => {
            // Find track with this hotkey in LATEST tracks
            const track = tracksRef.current.find(t => t.hotkey === accelerator);
            if (track) {
                playTrack(track.id);
            }
        });
        return cleanup;
    }, [playTrack]); // Stable dependency

    const panicStop = () => {
        Object.values(howlsRef.current).forEach(h => h.stop());
        setPlayingIds(new Set());
    };

    const confirmHotkey = (hotkey) => {
        if (editingTrackId) {
            const track = tracks.find(t => t.id === editingTrackId);
            if (track.hotkey) window.electronAPI.unregisterHotkey(track.hotkey);
            setTracks(prev => prev.map(t => t.id === editingTrackId ? { ...t, hotkey } : t));
            setEditingTrackId(null);
        }
    };

    const confirmTrim = (trimData) => {
        if (editingTrimTrackId) {
            setTracks(prev => prev.map(t => t.id === editingTrimTrackId ? { ...t, trim: trimData } : t));
            setEditingTrimTrackId(null);
        }
    };

    const updateTrack = (id, field, value) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
        if (field === 'volume' && howlsRef.current[id]) {
            howlsRef.current[id].volume(value / 100);
        }
    };

    const removeTrack = (id) => {
        howlsRef.current[id]?.stop();
        const t = tracks.find(x => x.id === id);
        if (t && t.hotkey) window.electronAPI.unregisterHotkey(t.hotkey);
        setTracks(prev => prev.filter(x => x.id !== id));
        delete howlsRef.current[id];
    };

    useEffect(() => {
        navigator.mediaDevices?.enumerateDevices()
            .then(devs => setOutputs(devs.filter(d => d.kind === 'audiooutput')))
            .catch(console.error);
    }, []);

    return (
        <div
            className="app-container"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <header style={{ marginBottom: '40px', WebkitAppRegion: 'drag' }}>
                <h1 className="header-title">Streamer Soundboard</h1>
                <div className="header-subtitle">Minimal Audio Control Center</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', WebkitAppRegion: 'no-drag' }}>
                    <button
                        className="btn-outline"
                        onClick={() => setShowReactions(true)}
                        style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                        Reaction Board
                    </button>
                    <Visualizer />
                </div>
            </header>

            {/* Main Track List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                <div className="track-list">
                    {tracks.length === 0 && (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#444', border: '1px dashed #333' }}>
                            Drag & Drop Audio Files
                        </div>
                    )}

                    {tracks.map(track => {
                        const isPlaying = playingIds.has(track.id);
                        return (
                            <div key={track.id} className={clsx('track-row', { 'playing': isPlaying })}>
                                <button className="btn-icon" onClick={() => playTrack(track.id)}>
                                    {isPlaying ? '■' : '▶'}
                                </button>

                                <div className="track-info" style={{ marginLeft: '20px', marginRight: '20px' }}>
                                    <div className="track-name">{track.name}</div>
                                    <div className="track-meta">
                                        <span style={{ opacity: 0.5 }}>VOL</span>
                                        <input
                                            type="range" min="0" max="100"
                                            value={track.volume}
                                            onChange={(e) => updateTrack(track.id, 'volume', parseInt(e.target.value))}
                                            style={{ width: '60px', margin: '0 10px' }}
                                        />
                                        {track.trim && <span style={{ color: '#2dd4bf', fontSize: '0.7rem' }}>TRIMMED</span>}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* Trim Button (+ CUT) */}
                                    <button
                                        className="btn-outline"
                                        style={{ fontSize: '0.75rem', padding: '4px 12px', height: '28px' }}
                                        onClick={() => setEditingTrimTrackId(track.id)}
                                    >
                                        + CUT
                                    </button>

                                    <div
                                        className={clsx('hotkey-tag', { 'active': isPlaying })}
                                        onClick={() => setEditingTrackId(track.id)}
                                    >
                                        {track.hotkey || '+ KEY'}
                                    </div>
                                </div>

                                <button className="btn-icon" style={{ marginLeft: '10px', fontSize: '1rem', opacity: 0.5 }} onClick={() => removeTrack(track.id)}>✕</button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Minimal */}
            <footer style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span>MASTER</span>
                    <input
                        type="range"
                        value={settings.masterVolume}
                        onChange={(e) => setSettings({ ...settings, masterVolume: parseInt(e.target.value) })}
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <select
                        value={settings.policy}
                        onChange={e => setSettings({ ...settings, policy: e.target.value })}
                        style={{ background: 'transparent', color: '#777', border: 'none', fontSize: '0.85rem' }}
                    >
                        <option value={POLICY.EXCLUSIVE}>CUT (단독)</option>
                        <option value={POLICY.MIX}>MIX (혼합)</option>
                        <option value={POLICY.QUEUE}>QUEUE (대기)</option>
                    </select>

                    <select
                        value={settings.outputDeviceId}
                        onChange={(e) => setSettings({ ...settings, outputDeviceId: e.target.value })}
                        style={{ background: 'transparent', color: '#777', border: 'none', maxWidth: '150px', fontSize: '0.85rem' }}
                    >
                        <option value="default">Default Speaker</option>
                        {outputs.map(o => (
                            <option key={o.deviceId} value={o.deviceId}>{o.label}</option>
                        ))}
                    </select>

                    <button style={{ background: 'transparent', border: 'none', color: '#cf6679', cursor: 'pointer' }} onClick={panicStop}>
                        PANIC (정지)
                    </button>
                </div>
            </footer>

            {editingTrackId && (
                <VirtualKeyboard
                    initialHotkey={tracks.find(t => t.id === editingTrackId)?.hotkey}
                    onConfirm={confirmHotkey}
                    onCancel={() => setEditingTrackId(null)}
                />
            )}

            {editingTrimTrackId && (
                <TrimModal
                    track={tracks.find(t => t.id === editingTrimTrackId)}
                    onConfirm={confirmTrim}
                    onCancel={() => setEditingTrimTrackId(null)}
                />
            )}

            {showReactions && (
                <ReactionSettings onClose={() => setShowReactions(false)} />
            )}
        </div>
    );
}

export default App;
