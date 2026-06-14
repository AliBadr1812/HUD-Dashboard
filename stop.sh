#!/bin/bash
# Stop HUD dashboard + Ollama

echo "Stopping Next.js..."
pkill -f "next dev" 2>/dev/null && echo "Next.js stopped." || echo "Next.js was not running."

echo "Stopping Ollama..."
if [ -f /tmp/hud-ollama.pid ]; then
  kill "$(cat /tmp/hud-ollama.pid)" 2>/dev/null
  rm /tmp/hud-ollama.pid
fi
pkill -f "ollama serve" 2>/dev/null && echo "Ollama stopped." || echo "Ollama was not running."

echo "Done."
