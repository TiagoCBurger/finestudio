-- Migration: Add Credits System
-- Created: 2024-12-10
-- Description: Adds credit system with audit trail

-- Add credit columns to profile table
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100 NOT NULL,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0 NOT NULL;

-- Create credit transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Negative for debit, positive for credit
  type VARCHAR NOT NULL CHECK (type IN ('usage', 'purchase', 'bonus', 'refund')),
  model_used VARCHAR,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on credit transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own transactions
CREATE POLICY "Users can view own credit transactions" 
ON credit_transactions FOR SELECT 
USING (auth.uid()::text = user_id);

-- Policy: Only server can insert transactions (no direct user access)
-- This prevents users from manually adding credits
CREATE POLICY "Server only credit transactions" 
ON credit_transactions FOR INSERT 
WITH CHECK (false); -- Always deny direct inserts

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- Create function to safely update credits (server-side only)
CREATE OR REPLACE FUNCTION update_user_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_type VARCHAR,
  p_model_used VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
  v_current_credits INTEGER;
  v_current_used INTEGER;
  v_available INTEGER;
  v_transaction_id TEXT;
BEGIN
  -- Get current balance
  SELECT credits, credits_used 
  INTO v_current_credits, v_current_used
  FROM profile 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  v_available := v_current_credits - v_current_used;
  
  -- For debit operations, check sufficient balance
  IF p_amount < 0 AND v_available < ABS(p_amount) THEN
    RAISE EXCEPTION 'Insufficient credits. Available: %, Required: %', v_available, ABS(p_amount);
  END IF;
  
  -- Update credits atomically
  IF p_amount < 0 THEN
    -- Debit: increase credits_used
    UPDATE profile 
    SET credits_used = credits_used + ABS(p_amount),
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Credit: increase total credits
    UPDATE profile 
    SET credits = credits + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id, amount, type, model_used, description, metadata
  ) VALUES (
    p_user_id, p_amount, p_type, p_model_used, p_description, p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  -- Return updated balance
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_credits TO authenticated;

-- Give new users 100 credits by default
UPDATE profile SET credits = 100, credits_used = 0 WHERE credits IS NULL;