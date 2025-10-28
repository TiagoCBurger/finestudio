# KIE GPT-4o Image API Implementation

## Overview

This document describes the implementation of the KIE GPT-4o Image API (GPT IMAGE 1) in the application. This model provides high-quality image generation with support for text-to-image and image-to-image transformations.

## Model Information

- **Model ID**: `kie/gpt-4o-image`
- **Provider**: KIE.ai
- **API Endpoint**: `https://api.kie.ai/api/v1/gpt4o-image/generate`
- **Supported Sizes**: `1:1`, `3:2`, `2:3`
- **Max Reference Images**: 5 images
- **Image Retention**: Generated images are stored for 14 days

## Features

### Text-to-Image Generation
Generate images from text prompts without any reference images.

```typescript
{
  prompt: "A beautiful sunset over the mountains",
  size: "1:1",
  nVariants: 1
}
```

### Image-to-Image Transformation
Transform existing images using text prompts and up to 5 reference images.

```typescript
{
  prompt: "Transform this into a watercolor painting",
  filesUrl: ["https://example.com/image.jpg"],
  size: "16:9",
  nVariants: 1
}
```

### Multiple Reference Images
Use up to 5 reference images to guide the generation process.

```typescript
{
  prompt: "Combine these images into a cohesive composition",
  filesUrl: [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  size: "3:2",
  nVariants: 1
}
```

## API Parameters

### Required Parameters

- **`size`** (string): Aspect ratio of the generated image
  - Options: `1:1`, `3:2`, `2:3`
  - Example: `"1:1"`

### Optional Parameters

- **`prompt`** (string): Text prompt describing the desired image
  - Required if `filesUrl` is not provided
  - Example: `"A beautiful sunset over the mountains"`

- **`filesUrl`** (string[]): Array of up to 5 image URLs for reference
  - Required if `prompt` is not provided
  - Supported formats: `.jfif`, `.pjpeg`, `.jpeg`, `.pjp`, `.jpg`, `.png`, `.webp`
  - Example: `["https://example.com/image1.png", "https://example.com/image2.jpg"]`

- **`nVariants`** (number): Number of image variations to generate
  - Options: `1`, `2`, `4`
  - Default: `1`
  - Note: Different credit costs apply

- **`maskUrl`** (string): Mask image URL for selective editing
  - Black areas: modify
  - White areas: preserve
  - Must match reference image dimensions
  - Ignored when multiple images are provided

- **`callBackUrl`** (string): Webhook URL for completion notifications
  - Recommended for production use
  - Example: `"https://your-app.com/api/webhooks/kie"`

- **`isEnhance`** (boolean): Enable prompt enhancement
  - Default: `false`
  - Useful for specialized scenarios (e.g., 3D renders)

- **`uploadCn`** (boolean): Choose upload region
  - `true`: China servers
  - `false`: Non-China servers
  - Default: `false`

- **`enableFallback`** (boolean): Enable automatic fallback to backup models
  - Default: `false`
  - Falls back to FLUX if GPT-4o is unavailable

- **`fallbackModel`** (string): Specify backup model
  - Options: `GPT_IMAGE_1`, `FLUX_MAX`
  - Default: `FLUX_MAX`
  - Only used when `enableFallback` is `true`

## Response Format

### Success Response (200)

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task12345"
  }
}
```

### Error Response Codes

- **200**: Success
- **400**: Format Error - Invalid JSON format
- **401**: Unauthorized - Missing or invalid credentials
- **402**: Insufficient Credits
- **404**: Not Found - Invalid endpoint
- **422**: Validation Error - Invalid parameters
- **429**: Rate Limited - Too many requests
- **455**: Service Unavailable - System maintenance
- **500**: Server Error - Unexpected error
- **550**: Connection Denied - Queue full

## Webhook Callback

When a task completes, KIE.ai sends a POST request to the `callBackUrl` with the following structure:

```json
{
  "taskId": "task12345",
  "status": "completed",
  "data": {
    "images": [
      {
        "url": "https://example.com/generated-image.png"
      }
    ]
  }
}
```

## Implementation Details

### File Structure

```
lib/models/image/
├── kie.ts                 # Client-side model definition
├── kie.server.ts          # Server-side implementation
├── provider-factory.ts    # Provider factory with model routing
├── types.ts              # Shared types
└── index.ts              # Model registry

app/api/webhooks/kie/
└── route.ts              # Webhook handler for callbacks
```

### Key Components

#### 1. Model Definition (`lib/models/image/kie.ts`)

```typescript
const models = [
    'google/nano-banana',
    'google/nano-banana-edit',
    'kie/gpt-4o-image',
] as const;
```

#### 2. Server Implementation (`lib/models/image/kie.server.ts`)

The `submitGpt4oImageJob` method handles:
- Request body preparation
- API call to GPT-4o endpoint
- Response validation
- Task ID extraction

#### 3. Model Registry (`lib/models/image/index.ts`)

```typescript
'kie-gpt-4o-image': {
  label: 'GPT-4o Image (Kie.ai)',
  chef: providers.kie,
  providers: [
    {
      ...providers.kie,
      model: kieAI.image('kie/gpt-4o-image'),
      getCost: () => 0.04,
    },
  ],
  sizes: ['1:1', '3:2', '2:3'],
  priceIndicator: 'low',
  supportsEdit: true,
  default: false,
  enabled: true,
}
```

#### 4. Webhook Handler (`app/api/webhooks/kie/route.ts`)

Enhanced to handle GPT-4o Image responses:
- Extracts images from `data.images` array
- Normalizes response format
- Updates project nodes with generated images

## Testing

### Manual Testing

Run the test script to verify the implementation:

```bash
node test-kie-gpt4o-image.mjs
```

This will test:
1. Text-to-image generation
2. Image-to-image transformation
3. Multiple reference images

### Integration Testing

1. Create an image node in the canvas
2. Select "GPT-4o Image (Kie.ai)" from the model dropdown
3. Choose an aspect ratio (1:1, 3:2, or 2:3)
4. Enter a prompt or connect reference images
5. Click generate
6. Verify the image appears when generation completes

## Configuration

### Environment Variables

```bash
# Required
KIE_API_KEY=your_kie_api_key

# Required for webhooks
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Getting API Key

1. Visit [KIE.ai API Key Management](https://kie.ai/api-key)
2. Generate a new API key
3. Add to `.env` file

## Pricing

- Base cost: ~0.04 credits per generation
- Varies based on:
  - Number of variants (1, 2, or 4)
  - Image size
  - Additional features (enhancement, etc.)

Check [KIE.ai Billing](https://kie.ai/billing) for current pricing.

## Limitations

1. **Image Retention**: Generated images expire after 14 days
2. **Max Reference Images**: 5 images maximum
3. **Supported Formats**: `.jfif`, `.pjpeg`, `.jpeg`, `.pjp`, `.jpg`, `.png`, `.webp`
4. **Aspect Ratios**: Limited to `1:1`, `3:2`, `2:3`

## Troubleshooting

### Common Issues

#### 1. "Missing request ID in webhook payload"
- Check webhook URL is correctly configured
- Verify `NEXT_PUBLIC_APP_URL` is set
- Ensure webhook endpoint is accessible

#### 2. "KIE_API_KEY is not configured"
- Add `KIE_API_KEY` to `.env` file
- Restart the development server

#### 3. "No video URL in result"
- This error is for video models, not image models
- Verify you're using the correct model ID

#### 4. Rate Limiting (429)
- Reduce request frequency
- Implement exponential backoff
- Contact KIE.ai support for rate limit increase

### Debug Logging

Enable debug logging by checking the console for:
- `🔍 [KIE GPT-4o]` - Request preparation
- `📤 [KIE GPT-4o]` - API request sent
- `📥 [KIE GPT-4o]` - API response received
- `✅ [KIE GPT-4o]` - Success messages
- `❌ [KIE GPT-4o]` - Error messages

## Future Enhancements

1. **Mask Support**: Implement selective image editing with masks
2. **Batch Generation**: Support for multiple variants (2 or 4)
3. **Prompt Enhancement**: Add UI toggle for `isEnhance` parameter
4. **Regional Upload**: Add UI option for China server routing
5. **Fallback Configuration**: Allow users to configure fallback models

## References

- [KIE.ai API Documentation](https://docs.kie.ai/4o-image-api/generate-4-o-image)
- [KIE.ai API Key Management](https://kie.ai/api-key)
- [KIE.ai Billing](https://kie.ai/billing)
- [File Upload API](https://docs.kie.ai/file-upload-api/quickstart)
