import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

function OverlayApp() {
    const [reactions, setReactions] = useState([]);
    const [settings, setSettings] = useState({
        opacity: 0.8,
        fontSize: '16px'
    });

    useEffect(() => {
        // Force body to be transparent for this component (because global CSS sets a dark background)
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';

        // Initial Load
        if (window.electronAPI) {
            window.electronAPI.getStore('reactions').then(res => {
                if (res) setReactions(res);
            });
            window.electronAPI.getStore('settings').then(res => {
                if (res) setSettings(prev => ({ ...prev, ...res }));
            });

            // Listen for live updates
            const cleanupReactions = window.electronAPI.onReactionsUpdated((updatedReactions) => {
                setReactions(updatedReactions);
            });
            const cleanupSettings = window.electronAPI.onSettingsUpdated((updatedSettings) => {
                setSettings(prev => ({ ...prev, ...updatedSettings }));
            });

            return () => {
                cleanupReactions();
                cleanupSettings();
            };
        }
    }, []);

    // Helper for background color with opacity
    // settings.opacity goes from 0 to 1
    // We want a subtle dark tint even at 0 (e.g., 0.2) or let it be fully transparent if user wants?
    // User requested "almost not opaque" -> likely wants FULL transparency range.
    // Let's map 0 -> 0.0 (transparent) and 1 -> 0.95 (solid black)
    const getBgColor = () => `rgba(0, 0, 0, ${settings.opacity !== undefined ? settings.opacity : 0.6})`;

    // Helper for blur - scales with opacity
    // If opacity is 0, blur should probably be 0 too.
    const getBlur = () => settings.opacity > 0.1 ? `blur(${settings.opacity * 10}px)` : 'none';

    const [isHovering, setIsHovering] = useState(false);

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                padding: '10px',
                boxSizing: 'border-box',
                backgroundColor: 'transparent',
                color: 'white',
                fontFamily: 'Inter, sans-serif',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Main Card Panel */}
            <div style={{
                flex: 1,
                background: getBgColor(),
                backdropFilter: getBlur(),
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: `1px solid rgba(255, 255, 255, ${settings.opacity * 0.2})`,
                boxShadow: settings.opacity > 0.1 ? '0 8px 32px rgba(0, 0, 0, 0.2)' : 'none',
                transition: 'all 0.3s ease'
            }}>

                {/* Header Area - Auto-Hide */}
                <div style={{
                    padding: '15px 15px 10px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    WebkitAppRegion: 'drag',
                    cursor: 'grab',
                    borderBottom: `1px solid rgba(255,255,255,${isHovering ? 0.1 : 0})`,
                    opacity: isHovering ? 1 : 0, // Only visible on hover
                    transition: 'opacity 0.3s ease',
                    height: 'auto',
                    minHeight: '40px' // Preserve layout space? Or animate height? Let's keep space to avoid jumping content
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '0.9rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ff0050',
                            display: 'inline-block'
                        }} />
                        Reaction Guide
                    </div>

                    {/* Close Button - NON DRAGGABLE */}
                    <div style={{ WebkitAppRegion: 'no-drag' }}>
                        <button
                            onClick={() => window.electronAPI.toggleOverlay()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'rgba(255,255,255, 0.8)',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                transition: 'background 0.2s',
                                pointerEvents: isHovering ? 'auto' : 'none' // Prevent accidental clicks when hidden
                            }}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {reactions.filter(r => r.active).map((reaction, idx) => (
                        <div key={reaction.id || idx} style={{
                            // Removed individual backgrounds so it looks like one panel
                            padding: '8px 12px',
                            borderRadius: '8px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)'
                        }}>
                            <div style={{
                                fontWeight: 'bold',
                                color: '#ffcc00',
                                marginRight: '10px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                {reaction.imagePath && (
                                    <img
                                        src={`media://${reaction.imagePath}`}
                                        alt=""
                                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                    />
                                )}
                                {reaction.trigger}
                            </div>
                            <div style={{
                                flex: 1,
                                fontWeight: '500',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                            }}>
                                {reaction.action}
                            </div>
                        </div>
                    ))}

                    {reactions.length === 0 && (
                        <div style={{
                            opacity: 0.6,
                            fontStyle: 'italic',
                            fontSize: '0.9rem',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            No active reactions configured.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OverlayApp;
