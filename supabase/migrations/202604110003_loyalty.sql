-- Loyalty Points System Schema.
-- - loyalty_programs: Config per business (earn/burn rates, min/max).
-- - loyalty_transactions: Earn/redeem logs per customer.
-- - Adds loyalty_points to customers.
-- - earn_loyalty_points/redeem_loyalty_points: RPCs for point management.

-- Migration: Loyalty Points System
-- Creates loyalty_programs, loyalty_transactions tables
-- Adds loyalty_points column to customers
-- RPCs: earn_loyalty_points, redeem_loyalty_points

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  earn_rate       NUMERIC(10,4) NOT NULL DEFAULT 1,    -- points earned per ₹100 spent
  burn_rate       NUMERIC(10,4) NOT NULL DEFAULT 1,    -- ₹ discount per point redeemed
  min_redeem_pts  INTEGER NOT NULL DEFAULT 50,         -- minimum points needed to redeem
  max_redeem_pct  NUMERIC(5,2) NOT NULL DEFAULT 20,   -- max % of bill that can be paid using points
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bill_id         UUID REFERENCES bills(id) ON DELETE SET NULL,
  txn_type        TEXT NOT NULL CHECK (txn_type IN ('earn', 'redeem', 'adjust')),
  points          INTEGER NOT NULL,                    -- positive=earn, negative=redeem
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add loyalty_points column to customers (safe: idempotent)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_programs_business" ON loyalty_programs;
CREATE POLICY "loyalty_programs_business" ON loyalty_programs
  USING (business_id = get_user_business_id(auth.uid()));

DROP POLICY IF EXISTS "loyalty_transactions_business" ON loyalty_transactions;
CREATE POLICY "loyalty_transactions_business" ON loyalty_transactions
  USING (business_id = get_user_business_id(auth.uid()));

-- ─── RPC: earn_loyalty_points ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION earn_loyalty_points(
  p_business_id   UUID,
  p_customer_id   UUID,
  p_bill_id       UUID,
  p_bill_total    NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_program     loyalty_programs%ROWTYPE;
  v_points_earn INTEGER;
BEGIN
  -- Get program config
  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE business_id = p_business_id AND is_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate points: earn_rate points per ₹100
  v_points_earn := FLOOR((p_bill_total / 100.0) * v_program.earn_rate);
  IF v_points_earn <= 0 THEN
    RETURN 0;
  END IF;

  -- Update customer points
  UPDATE customers
  SET loyalty_points = loyalty_points + v_points_earn
  WHERE id = p_customer_id;

  -- Log transaction
  INSERT INTO loyalty_transactions (business_id, customer_id, bill_id, txn_type, points, description)
  VALUES (p_business_id, p_customer_id, p_bill_id, 'earn', v_points_earn,
          'Earned ' || v_points_earn || ' points on bill');

  RETURN v_points_earn;
END;
$$;

-- ─── RPC: redeem_loyalty_points ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_business_id     UUID,
  p_customer_id     UUID,
  p_points_to_redeem INTEGER,
  p_bill_id         UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_program       loyalty_programs%ROWTYPE;
  v_current_pts   INTEGER;
  v_discount_amt  NUMERIC;
BEGIN
  -- Validate program
  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE business_id = p_business_id AND is_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loyalty program not enabled';
  END IF;

  -- Get current balance
  SELECT loyalty_points INTO v_current_pts
  FROM customers
  WHERE id = p_customer_id;

  IF v_current_pts < p_points_to_redeem THEN
    RAISE EXCEPTION 'Insufficient loyalty points (have %, need %)', v_current_pts, p_points_to_redeem;
  END IF;

  IF p_points_to_redeem < v_program.min_redeem_pts THEN
    RAISE EXCEPTION 'Minimum redemption is % points', v_program.min_redeem_pts;
  END IF;

  -- Calculate discount
  v_discount_amt := p_points_to_redeem * v_program.burn_rate;

  -- Deduct points
  UPDATE customers
  SET loyalty_points = loyalty_points - p_points_to_redeem
  WHERE id = p_customer_id;

  -- Log transaction
  INSERT INTO loyalty_transactions (business_id, customer_id, bill_id, txn_type, points, description)
  VALUES (p_business_id, p_customer_id, p_bill_id, 'redeem', -p_points_to_redeem,
          'Redeemed ' || p_points_to_redeem || ' points for ₹' || v_discount_amt || ' discount');

  RETURN v_discount_amt;
END;
$$;
