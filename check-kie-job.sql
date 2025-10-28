-- Check KIE GPT-4o job status
-- Replace with your actual requestId

SELECT 
    id,
    "requestId",
    "userId",
    "modelId",
    type,
    status,
    input->>'prompt' as prompt,
    result,
    error,
    "createdAt",
    "completedAt"
FROM fal_jobs
WHERE "requestId" = '14423c11b9b99bd342d274b31d6f2b31'
ORDER BY "createdAt" DESC
LIMIT 1;
