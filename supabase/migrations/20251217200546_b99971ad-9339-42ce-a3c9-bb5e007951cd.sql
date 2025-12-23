-- Add due_date column to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS due_date date;