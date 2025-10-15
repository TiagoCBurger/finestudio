-- Quick fix: Apply credits system to existing database
-- Run this in Supabase SQL Editor if migrations haven't been applied

-- Step 1: Add credit columns to profile table (if they don't exist)
DO $$ 
BEGIN
  -- Add credits column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profile' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profile ADD COLUMN credits INTEGER DEFAULT 100 NOT NULL;
  END IF;

  -- Add credits_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profile' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE profile ADD COLUMN credits_used INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Step 2: Update existing profiles with default credits
UPDATE profile 
SET credits = COALESCE(credits, 100),
    credits_used = COALESCE(credits_used, 0)
WHERE credits IS NULL OR credits_used IS NULL;

-- Step 3: Create credit transactions table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('usage', 'purchase', 'bonus', 'refund')),
  model_used VARCHAR,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 4: Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Server only credit transactions" ON credit_transactions;

-- Step 6: Create policies
CREATE POLICY "Users can view own credit transactions" 
ON credit_transactions FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Server only credit transactions" 
ON credit_transactions FOR INSERT 
WITH CHECK (false);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- Step 8: Create or replace the credits update function
CREATE OR REPLACE FUNCTION update_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_type VARCHAR,
  p_model_used VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_current_credits INTEGER;
  v_current_used INTEGER;
  v_available INTEGER;
  v_transaction_id TEXT;
BEGIN
  SELECT credits, credits_used 
  INTO v_current_credits, v_current_used
  FROM profile 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  v_available := v_current_credits - v_current_used;
  
  IF p_amount < 0 AND v_available < ABS(p_amount) THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_available, ABS(p_amount);
  END IF;
  
  IF p_amount < 0 THEN
    UPDATE profile 
    SET credits_used = credits_used + ABS(p_amount),
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE profile 
    SET credits = credits + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  INSERT INTO credit_transactions (
    user_id, amount, type, model_used, description, metadata
  ) VALUES (
    p_user_id, p_amount, p_type, p_model_used, p_description, p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  SELECT credits, credits_used 
  INTO v_current_credits, v_current_used
  FROM profile 
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance', jsonb_build_object(
      'total', v_current_credits,
      'used', v_current_used,
      'available', v_current_credits - v_current_used
    )
  );
END;
$func$;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION update_user_credits TO authenticated;

-- Done!
SELECT 'Credits system applied successfully!' as status;
