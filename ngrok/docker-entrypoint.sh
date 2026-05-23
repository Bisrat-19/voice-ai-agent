#!/bin/sh
set -e

INSPECTOR_PORT="${HOST_PORT:-4040}"

printf '\n========================================\n'
printf ' ngrok inspector:    http://localhost:%s\n' "$INSPECTOR_PORT"
printf '========================================\n'

ngrok start --all --config /etc/ngrok.yml --log=stdout --log-format=logfmt --log-level=info &
ngrok_pid=$!

i=0
while [ "$i" -lt 30 ]; do
  if wget -qO- "http://127.0.0.1:${INSPECTOR_PORT}/api/tunnels" 2>/dev/null | grep -q public_url; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

tunnels_json=$(wget -qO- "http://127.0.0.1:${INSPECTOR_PORT}/api/tunnels" 2>/dev/null || true)
if [ -n "$tunnels_json" ] && echo "$tunnels_json" | grep -q public_url; then
  printf '\n ngrok public tunnel(s):\n'
  echo "$tunnels_json" \
    | grep -oE '"public_url":"https://[^"]+"' \
    | sed 's/"public_url":"//;s/"$//' \
    | while read -r url; do
        printf '   %s\n' "$url"
        printf '   webhook: %s/vapi/call-ended\n' "$url"
      done
  printf '\n'
else
  printf '\n (waiting for tunnel — open http://localhost:%s for status)\n\n' "$INSPECTOR_PORT"
fi

wait "$ngrok_pid"
