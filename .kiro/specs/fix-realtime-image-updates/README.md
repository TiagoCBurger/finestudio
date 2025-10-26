# Fix Realtime Image Updates - Spec Summary

## Problem Statement

Two critical realtime update issues in the image generation system:

1. **Queue doesn't update automatically**: When generating an image, the QueueMonitor component doesn't show the new job without page reload
2. **Image doesn't appear in node after webhook**: When webhook processes the image, the visual node doesn't update with the generated image

## Solution Approach

**Phase 1: Diagnose** - Add comprehensive logging to identify where the update chain breaks
**Phase 2: Fix** - Repair identified issues in triggers, subscriptions, or webhooks  
**Phase 3: Enhance** - Add optimistic updates for better UX
**Phase 4: Validate** - Test thoroughly with KIE.ai provider

## Key Design Decisions

- **Provider-agnostic**: Solution works with any provider (KIE.ai, Fal.ai, etc)
- **Testing with KIE.ai**: All tests use KIE.ai as it's currently configured
- **Supports v1 and v2**: Fixes apply to both current (v1) and refactored (v2) architectures
- **Logging-first**: Comprehensive logging before making changes
- **Incremental**: Diagnose → Fix → Enhance → Validate

## Update Chain

```
User Action → createFalJob() → DB INSERT → Trigger → Broadcast → Client → UI
                                                                    ↓
Webhook → Upload → Update Job → DB UPDATE → Trigger → Broadcast → Client → UI
                                    ↓
                            Update Project → DB UPDATE → Trigger → Broadcast → Client → UI
```

## Files Involved

### v1 (Current)
- `app/actions/image/create.ts` - Image generation action
- `app/api/webhooks/kie/route.ts` - Webhook handler
- `hooks/use-queue-monitor.ts` - Queue monitoring
- `hooks/use-project-realtime.ts` - Project updates

### v2 (Refactored)
- `app/actions/image/create.v2.ts` - Image generation action
- `lib/webhooks/image-webhook-handler.ts` - Unified webhook handler
- `app/api/webhooks/kie/route.v2.ts` - Webhook endpoint
- `lib/models/image/provider-base.ts` - Provider abstraction

### Shared
- `supabase/migrations/*_fal_jobs_realtime.sql` - Job broadcast trigger
- `supabase/migrations/*_fix_realtime_broadcasts.sql` - Project broadcast trigger
- `hooks/use-queue-monitor.ts` - Queue monitoring (used by both)
- `hooks/use-project-realtime.ts` - Project updates (used by both)

## Implementation Priority

1. **HIGH**: Diagnostic logging (Tasks 1-5)
2. **HIGH**: Fix identified issues (Tasks 6-8)
3. **MEDIUM**: Optimistic updates (Task 9)
4. **LOW**: Fallback polling (Task 10) - Optional
5. **MEDIUM**: Testing and documentation (Tasks 11-12)

## Testing Strategy

All tests use **KIE.ai** provider with models:
- `google/nano-banana` (text-to-image)
- `google/nano-banana-edit` (image-to-image)

Test scenarios:
1. Job creation → Queue update
2. Job completion → Image appears in node
3. Multi-tab synchronization
4. Error handling
5. Fallback polling (optional)

## Success Criteria

- ✅ New jobs appear in queue without refresh
- ✅ Completed images appear in nodes without refresh
- ✅ Multi-tab sync works correctly
- ✅ Comprehensive logs for debugging
- ✅ Works with KIE.ai (and any other provider)

## Next Steps

1. Review and approve this spec
2. Start with Task 1: Add diagnostic logging to database triggers
3. Follow tasks sequentially through phases
4. Test with KIE.ai after each phase
5. Document findings and solutions

## Related Documentation

- `requirements.md` - Detailed requirements with EARS format
- `design.md` - Technical design and architecture
- `tasks.md` - Step-by-step implementation plan
