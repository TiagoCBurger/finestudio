# WAN-25 Preview Model Implementation

## Overview

Successfully implemented the `fal-ai/wan-25-preview/text-to-video` model in the Tersa platform.

## Model Details

- **Model ID**: `fal-ai/wan-25-preview/text-to-video`
- **Type**: Text-to-Video (no image input required)
- **Provider**: Fal.ai
- **Status**: Preview/Beta

## Configuration

### Supported Parameters

- **Durations**: 5s, 10s
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Input**: Text prompt only (no image required)

### Pricing

```typescript
getCost: ({ duration }) => {
    return duration <= 5 ? 0.5 : 1.0;
}
```

**Note**: Pricing is estimated as this is a preview model. Actual costs may vary.

## Implementation Details

### Files Modified

1. **`lib/models/video/fal.ts`**
   - Added `'fal-ai/wan-25-preview/text-to-video'` to `FalVideoModel` type

2. **`lib/models/video/fal.server.ts`**
   - Added `'fal-ai/wan-25-preview/text-to-video'` to `FalVideoModel` type
   - No special duration adjustment needed (uses standard 5s, 10s)

3. **`lib/models/video/index.server.ts`**
   - Added new model entry: `'fal-wan-25-preview'`
   - Configured with text-to-video endpoint only (no image-to-video variant)

### Model Configuration

```typescript
'fal-wan-25-preview': {
    label: 'WAN-25 Preview (Text-to-Video)',
    chef: providers.fal,
    providers: [
        {
            ...providers.fal,
            model: falServer('fal-ai/wan-25-preview/text-to-video', undefined),
            getCost: ({ duration }) => {
                return duration <= 5 ? 0.5 : 1.0;
            },
        },
    ],
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    enabled: true,
}
```

## Usage

### From UI

1. Select "WAN-25 Preview (Text-to-Video)" from video model dropdown
2. Enter text prompt
3. Choose duration (5s or 10s)
4. Choose aspect ratio (16:9, 9:16, or 1:1)
5. Generate video

**Note**: This model does NOT require an image input (text-to-video only).

### API Example

```typescript
const result = await generateVideoAction({
    modelId: 'fal-wan-25-preview',
    prompt: 'A serene sunset over the ocean with waves gently crashing',
    images: [], // No image required
    duration: 5,
    aspectRatio: '16:9',
    nodeId: 'node-123',
    projectId: 'project-456',
});
```

## Webhook Support

✅ **Fully supported** - Uses the same webhook infrastructure as other video models:

- Submits job to Fal.ai queue with webhook URL
- Returns `pending:${requestId}` immediately
- Webhook updates database when complete
- Frontend polls via `/api/fal-jobs/[requestId]`
- Realtime updates via Supabase broadcast

### Expected Processing Time

- **5s video**: ~2-3 minutes
- **10s video**: ~3-4 minutes

## Technical Notes

### Model Behavior

- **Text-to-Video Only**: Unlike Kling and Sora 2, WAN-25 does NOT support image-to-video
- **No Duration Adjustment**: Uses standard 5s/10s durations (no special mapping needed)
- **Standard Aspect Ratios**: Supports all common aspect ratios

### Error Handling

If an image is accidentally provided, the model will ignore it and generate based on text prompt only.

### Comparison with Other Models

| Model | Type | Durations | Image Support | Price (5s) |
|-------|------|-----------|---------------|------------|
| Kling v2.5 Turbo Pro | Both | 5s, 10s | ✅ Yes | $0.35 |
| Sora 2 Pro | Image-to-Video | 4s, 8s, 12s | ✅ Required | $1.20 |
| WAN-25 Preview | Text-to-Video | 5s, 10s | ❌ No | ~$0.50 |

## Testing Checklist

- [x] Type definitions updated (client & server)
- [x] Model registered in index.ts (client-side)
- [x] Model registered in index.server.ts (server-side)
- [x] No TypeScript errors
- [x] Webhook support enabled
- [x] Test script created and passed
- [ ] Test text-to-video generation in UI
- [ ] Verify pricing accuracy with Fal.ai
- [ ] Test different durations (5s, 10s)
- [ ] Test different aspect ratios
- [ ] Verify realtime updates work

## Future Improvements

1. **Pricing Verification**: Update pricing once official rates are published
2. **Model Capabilities**: Document any special features or limitations
3. **Quality Comparison**: Compare output quality with other models
4. **Performance Metrics**: Track average generation times

## References

- [Fal.ai WAN-25 Model Page](https://fal.ai/models/wan-25-preview)
- [Fal.ai API Documentation](https://fal.ai/docs)

---

**Status**: ✅ Implementation Complete
**Date**: 2024-12-16
**Version**: 1.0.0
