import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import '../styles.css';

// Simport React, { useEffect, useState } from 'react';

export default function VirtualKeyboard({ initialHotkey, onConfirm, onCancel }) {
    // Always split into array. If empty string, empty array.
    const [currentCombo, setCurrentCombo] = useState(initialHotkey ? initialHotkey.split('+').filter(Boolean) : []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const key = e.key;

            // Label mapping
            let label = key;
            if (key === 'Control') label = 'Ctrl';
            if (key === 'Meta') label = window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Super';
            // Treat Space as 'Space' text
            if (key === ' ') label = 'Space';
            // Uppercase single letters
            if (key.length === 1) label = key.toUpperCase();

            if (key === 'Escape') {
                onCancel();
                return;
            }
            if (key === 'Enter') {
                onConfirm(currentCombo.join('+'));
                return;
            }
            if (key === 'Backspace') {
                setCurrentCombo(prev => prev.slice(0, -1));
                return;
            }

            // Add to stack if not exists
            setCurrentCombo(prev => {
                if (prev.includes(label)) return prev;
                return [...prev, label];
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentCombo, onConfirm, onCancel]);

    const clear = () => setCurrentCombo([]);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 style={{ fontWeight: 300, letterSpacing: '2px', fontSize: '0.9rem', color: '#777', textTransform: 'uppercase', marginBottom: '20px' }}>
                    Record Hotkey
                </h2>

                <div className="combo-display">
                    {currentCombo.length > 0 ? (
                        currentCombo.map((k, i) => (
                            <React.Fragment key={i}>
                                <span className="key-badge">{k}</span>
                                {i < currentCombo.length - 1 && <span style={{ color: '#444', fontSize: '1rem', margin: '0 8px' }}>+</span>}
                            </React.Fragment>
                        ))
                    ) : (
                        <span style={{ color: '#333', fontSize: '1.2rem' }}>Type keys...</span>
                    )}
                </div>

                <div className="instruction" style={{ marginBottom: '30px', color: '#666', lineHeight: '1.5' }}>
                    Press keys to stack them.<br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Backspace: Undo | Enter: Save | Esc: Cancel</span>
                </div>

                <div className="action-area" style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button className="btn-text" onClick={onCancel} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                    <button className="btn-text" onClick={clear} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}>Clear</button>
                    <button
                        className="btn-outline"
                        onClick={() => onConfirm(currentCombo.join('+'))}
                        style={{
                            background: 'transparent', border: '1px solid #555', color: '#fff',
                            padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Save Hotkey
                    </button>
                </div>
            </div>
        </div>
    );
}
