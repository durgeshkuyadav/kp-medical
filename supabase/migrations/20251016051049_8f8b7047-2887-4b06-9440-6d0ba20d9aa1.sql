-- Create cash_entries table for manual cash management
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for cash entries
CREATE POLICY "Authenticated staff can view cash entries"
ON public.cash_entries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated staff can insert cash entries"
ON public.cash_entries
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can delete cash entries"
ON public.cash_entries
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cash_entries_updated_at
BEFORE UPDATE ON public.cash_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();