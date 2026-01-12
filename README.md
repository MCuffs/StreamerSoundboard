# Streamer Soundboard

A premium, low-latency soundboard for streamers (OBS/TikTok Live).

## Features
- **Global Hotkeys**: Trigger sounds even when the app is in background.
- **Toggle Playback**: Press the same key to stop.
- **Playback Modes**:
  - **Cut (Exclusive)**: Stops others, plays new.
  - **Mix (Parallel)**: Plays over existing sounds.
  - **Queue**: Adds to a playlist if busy.
- **Audio Output Selection**: Route audio to VB-Cable or specific devices.
- **Drag & Drop**: Easily add MP3s.

## Setup
1. Install dependencies: `npm install`
2. Run in development mode: `npm run dev`
3. Build for production: `npm run build` (then check `dist/`)

## Tech Stack
- **Electron**: System integration (Global Shortcuts).
- **React + Vite**: Fast, responsive UI.
- **Howler.js**: Professional Web Audio management.
