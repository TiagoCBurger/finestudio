# Quick Test Guide - OpenRouter Text Models

## 🚀 Quick Start

### Run Automated Tests
```bash
node .kiro/specs/openrouter-text-models/verify-text-transform.js
```

Expected output: All tests should pass ✅

## 🧪 Manual Testing (5 minutes)

### Test 1: Text Input (1 min)
1. Open a text transform node
2. Type in the instructions field → Should work ✅
3. Paste some text → Should work ✅
4. Edit the text → Should save ✅

### Test 2: With OpenRouter API Key (2 min)
1. Add to `.env`: `OPENROUTER_API_KEY=your_key`
2. Restart server: `npm run dev`
3. Open model selector → Should see 4 OpenRouter models ✅
4. Select "GPT-5" → Should select ✅
5. Generate text → Should work ✅

### Test 3: Without OpenRouter API Key (1 min)
1. Remove `OPENROUTER_API_KEY` from `.env`
2. Restart server
3. Open model selector → OpenRouter models should be hidden ✅
4. Gateway models should still appear ✅

### Test 4: Gateway Compatibility (1 min)
1. Select a Gateway model (e.g., "o3")
2. Generate text → Should work ✅
3. Verify no errors ✅

## ✅ Success Criteria

All of these should be true:
- [ ] Text input works (type, paste, edit)
- [ ] OpenRouter models appear when API key is set
- [ ] OpenRouter models hidden when API key is not set
- [ ] Gateway models always work
- [ ] No TypeScript errors
- [ ] No console errors

## 🐛 Common Issues

### Issue: OpenRouter models not appearing
**Solution:** Check that `OPENROUTER_API_KEY` is in `.env` and server is restarted

### Issue: Text input not working
**Solution:** Verify `bg-transparent!` was removed from transform.tsx

### Issue: Gateway models not working
**Solution:** Check `AI_GATEWAY_API_KEY` is configured

## 📊 Test Results

Date: ___________

- [ ] Automated tests passed
- [ ] Text input works
- [ ] OpenRouter models work (with key)
- [ ] Models hidden (without key)
- [ ] Gateway models work
- [ ] No errors found

Tested by: ___________
