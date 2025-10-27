# KIE Text-to-Video Routing Fix

## Problem
The KIE (Kling) video model was only configured for `kling/v2-5-turbo-image-to-video-pro` and required an image input to function. When users tried to generate videos with text-only prompts, the system would throw an error requiring an image.

## Solution
Updated the KIE implementation to support both text-to-video and image-to-video models with automatic routing based on input:

### Changes Made

#### 1. Updated Type Definitions (`lib/models/video/kie.server.ts`)
- Added `kling/v2-5-turbo-text-to-video-pro` to the `KieVideoModel` type
- Created separate input types:
  - `KieImageToVideoInput` - includes `image_url` field
  - `KieTextToVideoInput` - excludes `image_url` field
- Updated function signature to accept both model IDs

#### 2. Implemented Smart Routing Logic
```typescript
const modelId = imagePrompt
    ? imageToVideoModelId  // With image → image-to-video
    : textToVideoModelId || imageToVideoModelId;  // Without image → text-to-video
```

#### 3. Conditional Input Building
- When image is provided: includes `image_url` field (image-to-video mode)
- When no image: excludes `image_url` field (text-to-video mode)

#### 4. Updated Model Configuration
Both client and server configurations now include:
```typescript
model: kie(
    'kling/v2-5-turbo-image-to-video-pro',
    'kling/v2-5-turbo-text-to-video-pro'
)
```

## How It Works

### Scenario A: Text-Only Generation
1. User provides only text prompt (no image node connected)
2. System detects `imagePrompt` is undefined/empty
3. Routes to `kling/v2-5-turbo-text-to-video-pro`
4. Sends API request WITHOUT `image_url` field

### Scenario B: Image-to-Video Generation
1. User provides text prompt + image node connected
2. System detects `imagePrompt` has a valid URL
3. Routes to `kling/v2-5-turbo-image-to-video-pro`
4. Sends API request WITH `image_url` field

## Benefits
- ✅ Supports both text-to-video and image-to-video workflows
- ✅ Automatic routing based on input (no manual selection needed)
- ✅ Follows the same pattern as FAL implementation
- ✅ Maintains backward compatibility with existing image-to-video usage
- ✅ Proper TypeScript typing for both input types

## Testing
Run the test script to verify routing logic:
```bash
node test-kie-text-to-video.mjs
```

## Files Modified
- `lib/models/video/kie.ts` - Client-side model definition
- `lib/models/video/kie.server.ts` - Server-side implementation with routing
- `lib/models/video/index.ts` - Client model configuration
- `lib/models/video/index.server.ts` - Server model configuration

## API Compatibility
The fix ensures proper API calls to KIE:
- Text-to-video endpoint receives only text parameters
- Image-to-video endpoint receives text + image_url parameters
- No breaking changes to existing functionality
