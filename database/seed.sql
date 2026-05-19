-- ============================================================
-- Optional seed data for development/testing
-- Run after schema.sql in Supabase SQL Editor
-- ============================================================

-- Test clients
INSERT INTO clients (name, phone, email, notes, contact_consent, last_stay_date)
VALUES
  ('John Omondi', '+254712345678', 'john@example.com', 'VIP guest. Prefers room 201.', true, CURRENT_DATE - INTERVAL '3 days'),
  ('Mary Achieng', '+254723456789', 'mary@example.com', '', true, CURRENT_DATE - INTERVAL '45 days'),
  ('James Otieno', '+254734567890', NULL, 'Requested extra pillows last visit.', false, CURRENT_DATE - INTERVAL '10 days')
ON CONFLICT (phone) DO NOTHING;

-- Test bookings
INSERT INTO bookings (client_id, date, time, service, status)
SELECT id, CURRENT_DATE + INTERVAL '2 days', '14:00', 'Standard Room - 2 nights', 'confirmed'
FROM clients WHERE phone = '+254712345678'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (client_id, date, time, service, status)
SELECT id, CURRENT_DATE + INTERVAL '5 days', '12:00', 'Conference Room - Full Day', 'confirmed'
FROM clients WHERE phone = '+254723456789'
ON CONFLICT DO NOTHING;
