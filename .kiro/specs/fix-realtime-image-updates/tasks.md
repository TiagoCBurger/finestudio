# Implementation Plan

- [x] 1. Add diagnostic logging to database triggers
- [x] 1.1 Enhance fal_jobs_broadcast_trigger with detailed logging
  - Add logging for trigger invocation (topic, operation, job_id, timestamp)
  - Add try-catch around broadcast_changes with success/failure logging
  - Add RAISE LOG for successful broadcasts
  - Add RAISE WARNING for failed broadcasts with error details
  - _Requirements: 3.1, 3.5, 5.1, 5.2_

- [x] 1.2 Enhance projects_broadcast_trigger with detailed logging
  - Add logging for trigger invocation (topic, operation, project_id, timestamp)
  - Add try-catch around broadcast_changes with success/failure logging
  - Add RAISE LOG for successful broadcasts
  - Add RAISE WARNING for failed broadcasts with error details
  - Add logging for which node was updated (if applicable)
  - _Requirements: 3.2, 3.4, 5.1, 5.2_

- [x] 1.3 Create SQL script to apply trigger enhancements
  - Create migration file with enhanced trigger functions
  - Test migration on local database
  - Document how to apply migration to production
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 2. Add diagnostic logging to client-side handlers
- [x] 2.1 Enhance useQueueMonitor with detailed logging
  - Add logging when broadcast is received (timestamp, userId, type, jobId, status change)
  - Add logging for current jobs state before update
  - Add logging for updated jobs state after update (count, jobIds, wasAdded, wasRemoved)
  - Add logging for deduplication checks
  - _Requirements: 1.1, 1.2, 5.3, 5.4_

- [x] 2.2 Enhance useProjectRealtime with detailed logging
  - Add logging when broadcast is received (timestamp, projectId, type, hasNew, hasOld)
  - Add logging before calling mutate() (projectId, cacheKey, timestamp)
  - Add logging after mutate() success or failure
  - Add logging for payload validation
  - _Requirements: 2.2, 2.3, 2.4, 5.3, 5.4, 5.5_

- [x] 2.3 Add logging to image node component rendering
  - Add logging when component receives new data from SWR
  - Add logging when image URL changes
  - Add logging when loading state changes
  - _Requirements: 2.5, 5.5_

- [x] 3. Add diagnostic logging to webhook processing
- [x] 3.1 Enhance v1 webhook handler (app/api/webhooks/kie/route.ts)
  - Add logging for database.update() calls (projectId, nodeId, imageUrl, result)
  - Add logging for each step of updateProjectNode function
  - Add logging for job status updates
  - Add logging for storage upload operations
  - _Requirements: 2.1, 5.1, 5.4_

- [x] 3.2 Enhance v2 webhook handler (lib/webhooks/image-webhook-handler.ts)
  - Add logging for database.update() calls (projectId, nodeId, imageUrl, result)
  - Add logging for each step of updateNodeState function
  - Add logging for job status updates
  - Add logging for storage upload operations
  - _Requirements: 2.1, 5.1, 5.4_

- [x] 4. Deploy and test diagnostic logging
- [x] 4.1 Deploy enhanced logging to development environment
  - Apply database migration with enhanced triggers
  - Deploy updated client code with enhanced logging
  - Deploy updated webhook handlers with enhanced logging
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.2 Test job creation flow with KIE.ai
  - Generate image using KIE.ai model (google/nano-banana or google/nano-banana-edit)
  - Collect logs from browser console
  - Collect logs from database (check Supabase logs or local PostgreSQL logs)
  - Collect logs from webhook endpoint
  - Document which logs appear and which don't
  - _Requirements: 1.1, 1.2, 1.3, 5.7_

- [x] 4.3 Test job completion flow with KIE.ai
  - Wait for KIE.ai webhook callback
  - Collect logs from webhook processing
  - Collect logs from database triggers
  - Collect logs from client handlers
  - Document which logs appear and which don't
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.7_

- [x] 4.4 Test multi-tab synchronization
  - Open two browser tabs with same project
  - Generate image in tab 1
  - Collect logs from both tabs
  - Document if tab 2 receives broadcasts
  - _Requirements: 1.5, 5.7_

- [x] 5. Analyze logs and identify root cause
- [x] 5.1 Analyze job creation logs
  - Check if database INSERT is successful
  - Check if fal_jobs_broadcast_trigger fires
  - Check if broadcast_changes is called successfully
  - Check if client receives broadcast
  - Check if handleJobUpdate is called
  - Check if React state updates
  - Document which step fails (if any)
  - _Requirements: 1.1, 1.2, 1.3, 5.6, 5.7_

- [x] 5.2 Analyze job completion logs
  - Check if webhook receives callback
  - Check if database UPDATE on fal_jobs is successful
  - Check if fal_jobs_broadcast_trigger fires for UPDATE
  - Check if database UPDATE on projects is successful
  - Check if projects_broadcast_trigger fires
  - Check if client receives project broadcast
  - Check if mutate() is called
  - Check if SWR revalidates
  - Check if component re-renders with new data
  - Document which step fails (if any)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.6, 5.7_

- [x] 5.3 Document findings
  - Create summary document with identified failure points
  - Include relevant log excerpts
  - Propose specific fixes for each failure point
  - _Requirements: 5.6, 5.7_

- [x] 6. Fix identified issues in database triggers
- [x] 6.1 Fix fal_jobs_broadcast_trigger if needed
  - Apply fix based on findings from task 5.1
  - Test fix with KIE.ai generation
  - Verify broadcasts are now received by client
  - _Requirements: 3.1, 3.3, 5.6_

- [x] 6.2 Fix projects_broadcast_trigger if needed
  - Apply fix based on findings from task 5.2
  - Test fix with KIE.ai webhook completion
  - Verify broadcasts are now received by client
  - _Requirements: 3.2, 3.4, 5.6_

- [x] 7. Fix identified issues in client subscriptions
- [x] 7.1 Fix useQueueMonitor subscription if needed
  - Apply fix based on findings from task 5.1
  - Ensure subscription is active and listening to correct topic
  - Ensure handleJobUpdate processes payloads correctly
  - Test with KIE.ai generation
  - _Requirements: 1.1, 1.2, 5.6_

- [x] 7.2 Fix useProjectRealtime subscription if needed
  - Apply fix based on findings from task 5.2
  - Ensure subscription is active and listening to correct topic
  - Ensure handleProjectUpdate processes payloads correctly
  - Ensure mutate() is called with correct parameters
  - Test with KIE.ai webhook completion
  - _Requirements: 2.2, 2.3, 2.4, 5.6_

- [x] 8. Fix identified issues in webhook processing
- [x] 8.1 Fix v1 webhook updateProjectNode if needed
  - Apply fix based on findings from task 5.2
  - Ensure database.update() modifies updatedAt field
  - Ensure content.nodes structure is correct
  - Test with KIE.ai webhook
  - _Requirements: 2.1, 5.6_

- [x] 8.2 Fix v2 webhook updateNodeState if needed
  - Apply fix based on findings from task 5.2
  - Ensure database.update() modifies updatedAt field
  - Ensure node state structure is correct
  - Test with KIE.ai webhook (if v2 is being used)
  - _Requirements: 2.1, 5.6_

- [x] 9. Implement optimistic updates for queue
- [x] 9.1 Modify v1 generateImageAction to return jobId
  - Update return value to include jobId in nodeData
  - Ensure jobId is available before API submission
  - Test that jobId is returned correctly
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 9.2 Modify v2 generateImageActionV2 to return jobId
  - Verify jobId is already in result.state
  - If not, update to include jobId
  - Test that jobId is returned correctly
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 9.3 Update image transform component to use optimistic updates
  - Call addJobOptimistically when generation starts
  - Pass jobId from server action response
  - Add deduplication logic to prevent duplicate jobs
  - Test with KIE.ai generation
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 9.4 Add deduplication logic to useQueueMonitor
  - Check if job already exists before adding from broadcast
  - Compare by jobId to avoid duplicates
  - Handle race condition between optimistic add and broadcast
  - Test with KIE.ai generation
  - _Requirements: 1.2, 4.5_

- [ ]* 10. Implement fallback polling mechanism
- [ ]* 10.1 Create useFallbackPolling hook
  - Accept requestId and isGenerating as parameters
  - Poll /api/fal-jobs/{requestId} every 5 seconds
  - Stop polling when job completes or fails
  - Call mutate() to refresh project when job completes
  - _Requirements: 2.6_

- [ ]* 10.2 Integrate polling into image node component
  - Use useFallbackPolling when requestId exists and status is generating
  - Add console logging for polling activity
  - Test by temporarily disabling realtime
  - _Requirements: 2.6_

- [ ]* 10.3 Add UI indicator for polling mode
  - Show subtle indicator when polling is active
  - Differentiate from realtime mode
  - Test user experience
  - _Requirements: 2.6_

- [ ] 11. Verify fixes with comprehensive testing
- [x] 11.1 Test complete flow with KIE.ai
  - Generate image using google/nano-banana
  - Verify job appears in queue immediately (optimistic or realtime)
  - Verify job updates to completed status
  - Verify image appears in node without refresh
  - Test in single tab
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 11.2 Test multi-tab synchronization with KIE.ai
  - Open two tabs with same project
  - Generate image in tab 1
  - Verify queue updates in tab 2
  - Verify image appears in tab 2
  - _Requirements: 1.5_

- [x] 11.3 Test error scenarios
  - Test with invalid model ID
  - Test with network disconnection
  - Test with webhook failure
  - Verify error handling and user feedback
  - _Requirements: 4.3, 5.6_

- [ ]* 11.4 Test fallback polling
  - Disable realtime connection
  - Generate image with KIE.ai
  - Verify polling activates
  - Verify image eventually appears
  - _Requirements: 2.6_

- [ ] 12. Document solution and findings
- [ ] 12.1 Create summary document
  - Document root cause identified
  - Document fixes applied
  - Document testing results
  - Include before/after comparisons
  - _Requirements: 5.7_

- [ ] 12.2 Update code comments
  - Add comments explaining realtime flow
  - Add comments explaining optimistic updates
  - Add comments explaining deduplication logic
  - _Requirements: 5.7_

- [ ] 12.3 Create troubleshooting guide
  - Document how to check if realtime is working
  - Document how to read diagnostic logs
  - Document common issues and solutions
  - _Requirements: 5.7_
