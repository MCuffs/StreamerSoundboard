import React, { useEffect, useRef } from 'react';
import { Howler } from 'howler';

const Visualizer = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    useEffect(() => {
        if (!Howler.ctx) return;

        // Create Analyser
        const analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // Connect Master Gain to Analyser
        // Inspect Howler's internal hook (Howler.masterGain)
        if (Howler.masterGain) {
            Howler.masterGain.connect(analyser);
        } else {
            // Fallback: try connecting destination back? No, Howler doesn't expose master easily in v2.2.
            // Alternative: Connect individual sounds? No.
            // Best bet: Howler.ctx.destination is the end.
            // We can't connect destination to analyser easily.
            // We need to inject the analyser before destination.
            // Howler.masterGain is usually exposed. 
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            // Clear
            ctx.fillStyle = '#121212'; // match bg
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Bars
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2; // scale down

                // Gradient
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#03dac6');
                gradient.addColorStop(1, '#bb86fc');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
            // Don't disconnect masterGain, it breaks audio
        };
    }, []);

    return <canvas ref={canvasRef} width={300} height={50} style={{ borderRadius: '4px', background: '#000' }} />;
};

export default Visualizer;
