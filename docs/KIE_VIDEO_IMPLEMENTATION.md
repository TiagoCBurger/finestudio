# KIE.ai Video Implementation

## Overview

This document describes the implementation of KIE.ai's Kling v2-5-turbo-image-to-video-pro model in the Tersa platform.

## Model Details

- **Model ID**: `kling/v2-5-turbo-image-to-video-pro`
- **Provider**: KIE.ai
- **Type**: Image-to-Video (requires input image)
- **Durations**: 5s or 10s
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Pricing**: $0.35 for 5s, $0.70 for 10s

## Architecture

### Client-Side (`lib/models/video/kie.ts`)
- Exports `kie()` factory function
- Returns VideoModel interface
- Throws error if called client-side (must use server)

### Server-Side (`lib/models/video/kie.server.ts`)
- Implements actual video generation logic
- Handles API communication with KIE.ai
- Supports webhook and polling modes
- Uploads completed videos to permanent storage

### Model Registration
- Added to `lib/models/video/index.ts` (client)
- Added to `lib/models/video/index.server.ts` (server)
- Model key: `kie-kling-v2.5-turbo-pro`

## API Integration

### Create Task
```typescript
POST https://api.kie.ai/api/v1/jobs/createTask
Headers:
  Authorization: Bearer {KIE_API_KEY}
  Content-Type: application/json
Body:
  {
    "model": "kling/v2-5-turbo-image-to-video-pro",
    "input": {
      "prompt": "video description",
      "image_url": "https://...",
      "duration": "5",
      "negative_prompt": "blur, distort, and low quality",
      "cfg_scale": 0.5
    },
    "callBackUrl": "https://your-app.com/api/webhooks/kie"
  }
```

### Query Task
```typescript
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Headers:
  Authorization: Bearer {KIE_API_KEY}
```

## Webhook Handling

The webhook handler (`app/api/webhooks/kie/route.ts`) now supports both images and videos:

1. Receives callback from KIE.ai when task completes
2. Checks job type (image vs video)
3. For videos:
   - Extracts video URL from `resultJson.resultUrls[0]`
   - Downloads video from temporary URL
   - Uploads to permanent storage (R2 or Supabase)
   - Updates job record with permanent URL

## Usage

### Prerequisites
1. Set `KIE_API_KEY` in environment variables
2. Set `NEXT_PUBLIC_APP_URL` for webhook support (production/tunnel)

### In Code
```typescript
import { videoModelsServer } from '@/lib/models/video/index.server';

const model = videoModelsServer['kie-kling-v2.5-turbo-pro'];
const videoUrl = await model.providers[0].model.generate({
  prompt: "A cat playing piano",
  imagePrompt: "https://example.com/cat.jpg", // Required
  duration: 5,
  aspectRatio: "16:9",
  _metadata: {
    nodeId: "node_123",
    projectId: "project_456"
  }
});
```

## Modes of Operation

### Webhook Mode (Recommended)
- Requires `NEXT_PUBLIC_APP_URL` to be set
- Returns immediately with `pending:{taskId}`
- Webhook updates job when complete
- Frontend polls `/api/fal-jobs/{taskId}` for status

### Polling Mode (Fallback)
- Used when `NEXT_PUBLIC_APP_URL` is not set
- Blocks request until video completes (5-10 minutes)
- Only for development without tunnel

## Testing

1. Ensure KIE_API_KEY is set
2. Start tunnel: `./scripts/tunnel.sh`
3. Set NEXT_PUBLIC_APP_URL to tunnel URL
4. Create video node in canvas
5. Select "Kling Video v2.5 Turbo Pro (KIE)"
6. Provide image and prompt
7. Monitor webhook logs

## Error Handling

- Missing image: Throws error (image required)
- API errors: Logged and propagated
- Upload failures: Job marked as failed
- Timeout: 10 minutes max polling

## Storage

Videos are stored using the configured storage provider:
- Cloudflare R2 (if configured)
- Supabase Storage (fallback)

Temporary URLs from KIE.ai are replaced with permanent storage URLs.

## Comparison with FAL

| Feature | KIE.ai | FAL.ai |
|---------|--------|--------|
| Model | Kling v2.5 Turbo Pro | Kling v2.5 Turbo Pro |
| Pricing | $0.35 / $0.70 | $0.35 / $0.70 |
| Image Required | Yes | Yes |
| Text-to-Video | No | Yes (separate endpoint) |
| Webhook Support | Yes | Yes |
| API Format | KIE format | FAL format |

## Future Enhancements

- Add support for more KIE video models
- Implement progress tracking
- Add video preview thumbnails
- Support batch video generation
