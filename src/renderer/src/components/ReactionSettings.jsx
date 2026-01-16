import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function ReactionSettings({ onClose }) {
    const [reactions, setReactions] = useState([]);

    const [settings, setSettings] = useState({ opacity: 0.6 });

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getStore('reactions').then(res => {
                if (res) setReactions(res);
            });
            window.electronAPI.getStore('settings').then(res => {
                if (res) setSettings(prev => ({ ...prev, ...res }));
            });
        }
    }, []);

    const saveSettings = (newSettings) => {
        setSettings(newSettings);
        if (window.electronAPI) {
            window.electronAPI.setStore('settings', newSettings);
        }
    };

    const saveReactions = (newReactions) => {
        setReactions(newReactions);
        if (window.electronAPI) {
            window.electronAPI.setStore('reactions', newReactions);
        }
    };

    const addReaction = () => {
        const newReaction = {
            id: uuidv4(),
            trigger: '1 Coin',
            imagePath: null,
            action: 'Clap',
            active: true
        };
        saveReactions([...reactions, newReaction]);
    };

    const selectImage = async (id) => {
        if (window.electronAPI) {
            const path = await window.electronAPI.selectImage();
            if (path) {
                updateReaction(id, 'imagePath', path);
            }
        }
    };

    const updateReaction = (id, field, value) => {
        const newReactions = reactions.map(r =>
            r.id === id ? { ...r, [field]: value } : r
        );
        saveReactions(newReactions);
    };

    const removeReaction = (id) => {
        saveReactions(reactions.filter(r => r.id !== id));
    };

    const toggleOverlay = () => {
        if (window.electronAPI) {
            window.electronAPI.toggleOverlay();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(5px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '700px',
                    height: '80%',
                    backgroundColor: '#1e1e1e',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    border: '1px solid #333'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Reaction Overlay Settings</h2>
                    <button
                        style={{
                            background: '#333',
                            border: '1px solid #555',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            color: '#ccc',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={toggleOverlay}
                        className="btn-primary" // Assuming you have some CSS, otherwise generic style
                        style={{
                            background: '#ff0050',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            flex: 1
                        }}
                    >
                        Toggle Overlay Window
                    </button>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', background: '#252525', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Background Opacity</span>
                        <span style={{ fontSize: '0.9rem', color: '#ffcc00' }}>{Math.round(settings.opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.opacity * 100}
                        onChange={(e) => {
                            const newOpacity = e.target.value / 100;
                            const newSettings = { ...settings, opacity: newOpacity };
                            setSettings(newSettings); // Update local state immediately
                            if (window.electronAPI) {
                                window.electronAPI.previewSettings(newSettings); // Valid live update
                            }
                        }}
                        onMouseUp={() => {
                            saveSettings(settings); // Persist to disk
                        }}
                        style={{ width: '100%', cursor: 'pointer' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                    {reactions.map(r => (
                        <div key={r.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#2a2a2a',
                            padding: '10px',
                            marginBottom: '10px',
                            borderRadius: '8px',
                            gap: '10px'
                        }}>
                            <input
                                type="checkbox"
                                checked={r.active}
                                onChange={(e) => updateReaction(r.id, 'active', e.target.checked)}
                                style={{ transform: 'scale(1.2)' }}
                            />

                            {/* Image Selection Area */}
                            <div
                                onClick={() => selectImage(r.id)}
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    background: '#333',
                                    borderRadius: '8px',
                                    border: '1px dashed #555',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}
                            >
                                {r.imagePath ? (
                                    <img
                                        src={`media://${r.imagePath}`}
                                        alt="icon"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '1.5rem', color: '#555' }}>+</span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>TRIGGER (Gift)</label>
                                <input
                                    type="text"
                                    value={r.trigger}
                                    onChange={(e) => updateReaction(r.id, 'trigger', e.target.value)}
                                    placeholder="e.g. 1 Coin"
                                    style={{
                                        background: '#333',
                                        border: '1px solid #444',
                                        color: 'white',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', fontSize: '1.5rem', color: '#555' }}>→</div>

                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>ACTION (Reaction)</label>
                                <input
                                    type="text"
                                    value={r.action}
                                    onChange={(e) => updateReaction(r.id, 'action', e.target.value)}
                                    placeholder="e.g. Clap"
                                    style={{
                                        background: '#333',
                                        border: '1px solid #444',
                                        color: 'white',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => removeReaction(r.id)}
                                style={{
                                    background: '#cf6679',
                                    color: 'white',
                                    border: 'none',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginLeft: '10px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addReaction}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#333',
                            border: '1px dashed #555',
                            color: '#ccc',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        + Add New Reaction
                    </button>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#777' }}>
                        Use "Window Capture" in TikTok Live Studio to show the overlay window.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ReactionSettings;
