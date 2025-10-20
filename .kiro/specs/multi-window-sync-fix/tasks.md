# Implementation Plan

- [x] 1. Create comprehensive diagnostic tool
  - Create script to test all realtime components systematically
  - Test trigger existence and functionality
  - Test RLS policies with actual user context
  - Test authentication flow
  - Test broadcast sending and receiving
  - Generate detailed diagnostic report
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Enhance database trigger with error handling
  - [x] 2.1 Update trigger function with explicit error handling
    - Add try-catch block around `realtime.broadcast_changes()`
    - Add logging for debugging (RAISE LOG)
    - Remove unnecessary type casts
    - Add variables for better readability
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Create migration file for trigger update
    - Write migration SQL file
    - Test migration on local database
    - Verify trigger fires correctly after update
    - _Requirements: 2.1, 2.2_

  - [ ]* 2.3 Add trigger monitoring query
    - Create SQL query to check trigger execution
    - Add query to diagnostic tool
    - _Requirements: 1.1, 1.2_

- [x] 3. Optimize RLS policies
  - [x] 3.1 Update SELECT policy for realtime.messages
    - Remove unnecessary type casts
    - Use more specific regex pattern
    - Optimize EXISTS subquery
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Verify and optimize indexes
    - Check if indexes exist on project(user_id)
    - Create GIN index on project(members) if missing
    - Test query performance with EXPLAIN ANALYZE
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Create migration file for policy updates
    - Write migration SQL file
    - Test migration on local database
    - Verify policies work correctly after update
    - _Requirements: 2.1, 2.2_

- [x] 4. Improve client-side error handling
  - [x] 4.1 Enhance useProjectRealtime hook
    - Add explicit error logging for subscription failures
    - Add detailed status logging for each subscription state
    - Improve error messages with actionable hints
    - Add broadcast receive logging
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Add subscription state tracking
    - Track last error with timestamp
    - Expose subscription state for debugging
    - Add method to manually retry subscription
    - _Requirements: 2.5, 4.1, 4.2_

  - [ ]* 4.3 Create React DevTools integration
    - Add custom hook for debugging in React DevTools
    - Show subscription state in component tree
    - _Requirements: 4.1, 4.2, 4.6_

- [x] 5. Create automated multi-window sync test
  - [x] 5.1 Enhance existing test script
    - Update test-multi-window-sync.js with better diagnostics
    - Add step-by-step verification
    - Add timing measurements
    - Test both directions (A→B and B→A)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Add authentication to test script
    - Implement proper login flow in test
    - Use real user credentials from .env
    - Test with private channels
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 5.3 Create CI/CD integration test
    - Add test to GitHub Actions workflow
    - Run test on every PR
    - Fail build if sync doesn't work
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Implement diagnostic dashboard
  - [ ] 6.1 Create diagnostic script
    - Write comprehensive diagnostic tool
    - Check trigger existence and definition
    - Check RLS policies
    - Test authentication
    - Test broadcast flow end-to-end
    - Generate JSON report
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 6.2 Add diagnostic command to package.json
    - Add npm script to run diagnostics
    - Add help text with usage instructions
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 6.3 Create web-based diagnostic UI
    - Create React component for diagnostics
    - Show real-time connection status
    - Show broadcast history
    - Add manual test buttons
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ] 7. Add visual sync indicators
  - [ ] 7.1 Create sync status component
    - Show connection status (connected/disconnected/reconnecting)
    - Show last sync timestamp
    - Show sync errors if any
    - Add to project canvas UI
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 7.2 Add broadcast animation
    - Show visual feedback when broadcast is received
    - Animate updated nodes briefly
    - Add subtle notification for sync events
    - _Requirements: 2.1, 2.2_

  - [ ]* 7.3 Add sync conflict resolution UI
    - Detect when multiple users edit simultaneously
    - Show conflict resolution options
    - Allow user to choose which version to keep
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 8. Run validation and testing
  - [ ] 8.1 Run diagnostic tool
    - Execute diagnostic script
    - Review all test results
    - Fix any issues found
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 8.2 Run multi-window sync test
    - Execute test-multi-window-sync.js
    - Verify both windows receive broadcasts
    - Measure latency (should be < 1 second)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 8.3 Manual testing in browser
    - Open two browser windows
    - Login to same account
    - Open same project in both windows
    - Move node in Window A
    - Verify node moves in Window B
    - Check console for errors
    - Test in both directions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [ ] 8.4 Test with multiple users
    - Login with two different accounts
    - Add second user as project member
    - Test sync between different users
    - Verify RLS policies work correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 8.5 Performance testing
    - Test with large projects (100+ nodes)
    - Measure broadcast latency
    - Test with slow network (throttling)
    - Verify no memory leaks
    - _Requirements: 2.1, 2.2, 2.5_

- [ ] 9. Documentation and cleanup
  - [ ] 9.1 Update README with sync information
    - Document how multi-window sync works
    - Add troubleshooting section
    - Document diagnostic tools
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 9.2 Add inline code comments
    - Document trigger function logic
    - Document RLS policy logic
    - Document client hook behavior
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 9.3 Create architecture diagram
    - Create visual diagram of sync flow
    - Show all components and interactions
    - Add to documentation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 9.4 Remove old test files
    - Clean up obsolete test scripts
    - Keep only working tests
    - Update .gitignore if needed
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
