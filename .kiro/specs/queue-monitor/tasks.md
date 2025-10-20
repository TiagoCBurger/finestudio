# Implementation Plan

- [x] 1. Setup database infrastructure
  - Create migration `supabase/migrations/YYYYMMDD_fal_jobs_realtime.sql`
  - Add trigger function `fal_jobs_broadcast_trigger()` that calls `realtime.broadcast_changes()`
  - Create trigger on fal_jobs table for INSERT, UPDATE, DELETE
  - Add RLS policy on realtime.messages for SELECT where topic matches `fal_jobs:{user_id}`
  - _Requirements: 5.1, 5.2, 8.3_

- [x] 2. Create API endpoint for listing jobs
  - Create `app/api/fal-jobs/route.ts` with GET handler (note: `/[requestId]/route.ts` already exists for single job)
  - Query fal_jobs table filtering by userId from auth
  - Support optional projectId query param to filter by `input->>'_metadata'->>'projectId'`
  - Return only pending/completed/failed jobs from last 24 hours, ordered by createdAt desc
  - _Requirements: 8.1, 8.4, 8.5_

- [x] 3. Create useQueueMonitor hook
  - Create `hooks/use-queue-monitor.ts`
  - Fetch jobs from new GET /api/fal-jobs endpoint on mount
  - Subscribe to Supabase Realtime channel `fal_jobs:{userId}` with `private: true`
  - Listen for broadcast events (INSERT, UPDATE, DELETE) and update local state
  - Calculate activeCount (jobs with status === 'pending')
  - Return: jobs, activeCount, isLoading, filter state, clearCompleted function
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.3_

- [x] 4. Create QueueItem component
  - Create `components/queue-monitor/queue-item.tsx`
  - Show icon based on status: Clock (pending), Loader2 (pending + spinning), CheckCircle2 (completed), XCircle (failed)
  - Display: job type icon, model name, time elapsed/completed
  - For completed: show small thumbnail from result.images[0].url or result.video.url
  - For failed: show error message
  - Add X button to remove from view (local state only)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Create QueueModal and QueueMonitor components
  - Create `components/queue-monitor.tsx` as single file with both components
  - QueueMonitor: button with List icon + Badge (if activeCount > 0), styled like existing top-right buttons
  - QueueModal: Dialog with filter tabs (Todas/Pendentes/Completadas/Erros), scrollable list of QueueItem
  - Implement filter logic to show/hide jobs based on selected tab
  - Add "Limpar Completadas" button that removes completed jobs from local state
  - Show toast on job completion/failure using existing toast system
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 5.2, 5.3, 6.1, 6.2, 7.3_

- [x] 6. Integrate into TopRight component
  - Update `components/top-right.tsx` to import and render QueueMonitor
  - Pass userId (from profile) and projectId (from project) as props
  - Position in flex container with existing Menu component
  - _Requirements: 1.1, 8.4, 8.5_
