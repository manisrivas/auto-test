#!/bin/bash
cd backend
PYTHON=$(find /usr /app /root /nix -name "python3" 2>/dev/null | head -1)
if [ -z "$PYTHON" ]; then
  PYTHON=$(find / -name "python3" 2>/dev/null | grep -v proc | head -1)
fi
echo "Using Python: $PYTHON"
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port $PORT
