#!/bin/bash
# Start Ollama + HUD dashboard

echo "Starting Ollama..."
ollama serve &>/tmp/ollama.log &
OLLAMA_PID=$!
echo $OLLAMA_PID > /tmp/hud-ollama.pid

# Wait for Ollama to be ready
for i in {1..10}; do
  if curl -s http://localhost:11434/api/version &>/dev/null; then
    echo "Ollama ready."
    break
  fi
  sleep 1
done

echo "Starting HUD dashboard..."
npm run dev
