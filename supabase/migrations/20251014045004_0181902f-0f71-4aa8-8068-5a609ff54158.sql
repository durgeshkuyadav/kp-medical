-- Trigger to auto-decrement medicine stock when sale items are inserted
CREATE OR REPLACE FUNCTION public.decrement_medicine_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement stock for the medicine
  UPDATE public.medicines
  SET stock = stock - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.medicine_id;
  
  -- Check if stock went below zero
  IF (SELECT stock FROM public.medicines WHERE id = NEW.medicine_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for medicine: %', NEW.medicine_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for stock decrement
CREATE TRIGGER on_sale_item_created
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_medicine_stock();

-- Trigger to update patient totals when sales are created/updated
CREATE OR REPLACE FUNCTION public.update_patient_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update for completed sales
  IF NEW.status = 'completed' THEN
    UPDATE public.patients
    SET 
      total_purchases = (
        SELECT COALESCE(SUM(total), 0)
        FROM public.sales
        WHERE patient_id = NEW.patient_id AND status = 'completed'
      ),
      last_visit = CURRENT_DATE,
      updated_at = now()
    WHERE id = NEW.patient_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for patient stats update
CREATE TRIGGER on_sale_completed
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_patient_stats();

-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;