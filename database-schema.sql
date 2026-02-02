-- SplitEase Database Schema
-- Designed for PostgreSQL (Supabase)

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);

-- ============================================
-- CONTACTS TABLE (for autocomplete)
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  times_billed_together INTEGER DEFAULT 1,
  last_billed_together TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, contact_phone)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_name ON contacts(contact_name);

-- ============================================
-- BILLS TABLE
-- ============================================
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_code VARCHAR(10) UNIQUE NOT NULL, -- Short shareable code
  organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organizer_phone VARCHAR(20),
  organizer_access_code VARCHAR(32) UNIQUE,
  organizer_recovery_code VARCHAR(10),
  organizer_recovery_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Receipt Information
  receipt_image_url TEXT, -- Cloud storage URL (Supabase Storage)
  receipt_analyzed BOOLEAN DEFAULT FALSE,
  
  -- OCR Extracted Data
  ocr_subtotal DECIMAL(10, 2),
  ocr_tax_amount DECIMAL(10, 2),
  ocr_tip_amount DECIMAL(10, 2),
  ocr_total DECIMAL(10, 2),
  
  -- Calculated Percentages
  tax_percent DECIMAL(5, 2) DEFAULT 0.00,
  tip_percent DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Metadata
  restaurant_name VARCHAR(255),
  bill_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bills_code ON bills(bill_code);
CREATE INDEX idx_bills_organizer ON bills(organizer_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_organizer_access_code ON bills(organizer_access_code);

-- ============================================
-- ITEMS TABLE
-- ============================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Track if item was OCR extracted or manually added
  source VARCHAR(20) DEFAULT 'manual', -- manual, ocr
  
  display_order INTEGER, -- For maintaining order from receipt
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_bill_id ON items(bill_id);

-- ============================================
-- PARTICIPANTS TABLE
-- ============================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if not registered
  
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  
  -- Status tracking
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_updated_at TIMESTAMP WITH TIME ZONE,
  has_responded BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_participants_bill_id ON participants(bill_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_phone ON participants(phone_number);

-- ============================================
-- CLAIMS TABLE (many-to-many: participants <-> items)
-- ============================================
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  
  -- Sharing configuration
  share_type VARCHAR(20) DEFAULT 'solo', -- solo, split_with_specific, split_with_all
  share_with_participant_ids UUID[], -- Array of participant IDs if split_with_specific
  quantity_claimed INTEGER DEFAULT 1,
  
  -- Calculated amounts
  amount_owed DECIMAL(10, 2), -- Pre-calculated for performance
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(item_id, participant_id)
);

CREATE INDEX idx_claims_item_id ON claims(item_id);
CREATE INDEX idx_claims_participant_id ON claims(participant_id);

-- ============================================
-- SMS_LOGS TABLE (for tracking invites)
-- ============================================
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT,
  
  status VARCHAR(20), -- sent, delivered, failed
  twilio_sid VARCHAR(50),
  
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX idx_sms_logs_bill_id ON sms_logs(bill_id);
CREATE INDEX idx_sms_logs_participant_id ON sms_logs(participant_id);

-- ============================================
-- PAYMENT_REQUESTS TABLE (optional - for Venmo integration)
-- ============================================
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL,
  
  payment_method VARCHAR(20), -- venmo, cashapp, paypal, zelle
  payment_handle VARCHAR(255), -- @username
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, paid, cancelled
  
  request_sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_requests_bill_id ON payment_requests(bill_id);
CREATE INDEX idx_payment_requests_participant_id ON payment_requests(participant_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Bills: Organizer and participants can view
CREATE POLICY "Organizer can view bills" ON bills
  FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Participants can view bills" ON bills
  FOR SELECT USING (
    id IN (
      SELECT bill_id FROM participants 
      WHERE user_id = auth.uid()
    )
  );

-- Bills: Only organizer can update
CREATE POLICY "Organizer can update bills" ON bills
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Items: Viewable by anyone on the bill
CREATE POLICY "Bill members can view items" ON items
  FOR SELECT USING (
    bill_id IN (
      SELECT id FROM bills 
      WHERE organizer_id = auth.uid()
    )
    OR
    bill_id IN (
      SELECT bill_id FROM participants 
      WHERE user_id = auth.uid()
    )
  );

-- Claims: Participants can manage their own claims
CREATE POLICY "Participants can manage claims" ON claims
  FOR ALL USING (
    participant_id IN (
      SELECT id FROM participants 
      WHERE user_id = auth.uid()
    )
  );

-- Contacts: Users can only see their own contacts
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Bill Summary View
CREATE VIEW bill_summaries AS
SELECT 
  b.id,
  b.bill_code,
  b.organizer_id,
  u.name AS organizer_name,
  b.receipt_image_url,
  b.tax_percent,
  b.tip_percent,
  b.status,
  b.created_at,
  
  -- Aggregated data
  COUNT(DISTINCT i.id) AS total_items,
  COUNT(DISTINCT p.id) AS total_participants,
  SUM(i.price * i.quantity) AS subtotal,
  
  -- Response tracking
  SUM(CASE WHEN p.has_responded THEN 1 ELSE 0 END) AS responses_count,
  BOOL_AND(p.has_responded) AS all_responded
  
FROM bills b
LEFT JOIN users u ON b.organizer_id = u.id
LEFT JOIN items i ON b.id = i.bill_id
LEFT JOIN participants p ON b.id = p.bill_id
GROUP BY b.id, u.name;

-- Participant Split Calculation View
CREATE VIEW participant_splits AS
SELECT 
  p.id AS participant_id,
  p.bill_id,
  p.name,
  p.phone_number,
  p.has_responded,
  
  -- Calculate total owed (items + tax + tip)
  SUM(c.amount_owed) AS total_owed
  
FROM participants p
LEFT JOIN claims c ON p.id = c.participant_id
GROUP BY p.id, p.bill_id, p.name, p.phone_number, p.has_responded;

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get all bills for a user (as organizer or participant)
/*
SELECT DISTINCT b.*
FROM bills b
LEFT JOIN participants p ON b.id = p.bill_id
WHERE b.organizer_id = 'USER_ID' OR p.user_id = 'USER_ID'
ORDER BY b.created_at DESC;
*/

-- Get complete bill details with participants and items
/*
SELECT 
  b.*,
  json_agg(DISTINCT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'phone', p.phone_number,
    'has_responded', p.has_responded
  )) AS participants,
  json_agg(DISTINCT jsonb_build_object(
    'id', i.id,
    'name', i.name,
    'price', i.price
  )) AS items
FROM bills b
LEFT JOIN participants p ON b.id = p.bill_id
LEFT JOIN items i ON b.id = i.bill_id
WHERE b.id = 'BILL_ID'
GROUP BY b.id;
*/

-- Get participant's claimed items with calculated splits
/*
SELECT 
  i.name AS item_name,
  i.price,
  c.share_type,
  c.amount_owed
FROM claims c
JOIN items i ON c.item_id = i.id
WHERE c.participant_id = 'PARTICIPANT_ID';
*/

-- Find frequently billed contacts for autocomplete
/*
SELECT 
  contact_name,
  contact_phone,
  times_billed_together,
  last_billed_together
FROM contacts
WHERE user_id = 'USER_ID'
  AND contact_name ILIKE '%SEARCH%'
ORDER BY times_billed_together DESC, last_billed_together DESC
LIMIT 5;
*/
