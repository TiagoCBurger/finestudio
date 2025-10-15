# Task 6 Manual Testing Guide

## Prerequisites
- Ensure `OPENROUTER_API_KEY` is set in `.env` file
- Start the development server

## Test Cases

### Test 1: Model Selector Shows OpenRouter Models
1. Open a project in the canvas
2. Add a Text Transform node
3. Click on the model selector dropdown
4. **Expected**: Should see OpenRouter models grouped by provider:
   - OpenAI: GPT-5
   - Anthropic: Claude Sonnet 4
   - Google: Gemini 2.5 Pro
   - OpenAI: GPT-4o Mini

### Test 2: Provider Icons Display Correctly
1. In the model selector dropdown
2. **Expected**: Each OpenRouter model should show the correct provider icon:
   - GPT-5 → OpenAI icon
   - Claude Sonnet 4 → Anthropic icon
   - Gemini 2.5 Pro → Google icon
   - GPT-4o Mini → OpenAI icon

### Test 3: Cost Display
1. Hover over each OpenRouter model in the selector
2. **Expected**: Should see cost information displayed correctly

### Test 4: Default Model Selection
1. Create a new Text Transform node
2. **Expected**: Should default to GPT-4o Mini (if OpenRouter is configured)

### Test 5: Gateway Models Still Work
1. Open model selector
2. Select a Gateway model (e.g., o3, claude-3.5-sonnet)
3. **Expected**: Gateway models should still be available and selectable

### Test 6: Without OpenRouter Key
1. Remove `OPENROUTER_API_KEY` from `.env`
2. Restart the server
3. Open model selector
4. **Expected**: Only Gateway models should appear
