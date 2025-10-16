# Webhook Tunnel Connection Fix

## Problem
Your serveo.net tunnel is failing to connect to localhost:3000, causing webhooks from Fal.ai to fail:
```
HTTP request from 146.75.191.27 to https://3fb8512a2f38f69187c1c1af28e7f2df.serveo.net/
connect_to localhost port 3000: failed.
```

## Root Cause
The SSH tunnel to serveo.net is either:
1. Not running
2. Disconnected
3. Not properly forwarding to port 3000

## Solution Options

### Option 1: Restart Serveo Tunnel (Quick Fix)

1. **Kill any existing serveo connections:**
```bash
pkill -f serveo
```

2. **Start a new tunnel:**
```bash
ssh -R 80:localhost:3000 serveo.net
```

3. **Copy the new URL** (it will be different each time)

4. **Update .env with the new URL:**
```bash
NEXT_PUBLIC_APP_URL=https://YOUR_NEW_SERVEO_URL.serveo.net
```

5. **Restart your Next.js server:**
```bash
# Stop current server (Ctrl+C)
pnpm dev
```

### Option 2: Use ngrok (More Reliable)

Ngrok is more stable than serveo for webhook development.

1. **Install ngrok:**
```bash
brew install ngrok
```

2. **Start ngrok tunnel:**
```bash
ngrok http 3000
```

3. **Copy the HTTPS URL** from ngrok output (e.g., `https://abc123.ngrok.io`)

4. **Update .env:**
```bash
NEXT_PUBLIC_APP_URL=https://YOUR_NGROK_URL.ngrok.io
```

5. **Restart Next.js:**
```bash
pnpm dev
```

### Option 3: Use Cloudflare Tunnel (Best for Production)

Most reliable option, free, and doesn't require keeping terminal open.

1. **Install cloudflared:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

2. **Start tunnel:**
```bash
cloudflared tunnel --url http://localhost:3000
```

3. **Copy the HTTPS URL** from output

4. **Update .env and restart**

## Verification Steps

After setting up your tunnel:

1. **Test tunnel is working:**
```bash
curl https://YOUR_TUNNEL_URL/api/webhooks/fal
```
Should return: `{"error":"Job not found"}` (404) - this is expected for GET request

2. **Check Next.js logs show:**
```
Fal.ai video submission mode: {
  mode: 'WEBHOOK (production/tunnel)',
  webhookUrl: 'https://YOUR_TUNNEL_URL/api/webhooks/fal'
}
```

3. **Generate a video/image** and watch for webhook logs

## Common Issues

### Issue: "Connection refused"
- Make sure Next.js is running on port 3000
- Check: `lsof -i :3000` should show node process

### Issue: "Tunnel disconnects frequently"
- Serveo is known to be unstable
- Switch to ngrok or cloudflared

### Issue: "Webhook still not received"
- Verify NEXT_PUBLIC_APP_URL has no trailing slash
- Restart Next.js after changing .env
- Check Fal.ai dashboard for webhook delivery status

## Current Status

Your current setup:
- ❌ Serveo tunnel: `https://3fb8512a2f38f69187c1c1af28e7f2df.serveo.net` (DISCONNECTED)
- ✅ Next.js server: Running on port 3000
- ✅ Webhook handler: `/api/webhooks/fal/route.ts` exists
- ❌ Tunnel connection: FAILED

## Recommended Action

**Use ngrok** (most reliable for development):

```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)

# Terminal 2: Update .env
# Change NEXT_PUBLIC_APP_URL to your ngrok URL

# Terminal 2: Restart Next.js
pnpm dev
```

Then test by generating a video/image.
