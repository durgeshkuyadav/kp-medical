-- Create enum types
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi');
CREATE TYPE sale_status AS ENUM ('completed', 'pending', 'cancelled');

-- Create patients table
CREATE TABLE public.patients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    total_purchases DECIMAL(10,2) DEFAULT 0,
    last_visit DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medicines table
CREATE TABLE public.medicines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    expiry_date DATE NOT NULL,
    batch_number TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    status sale_status NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_medications table (for tracking medication history)
CREATE TABLE public.patient_medications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (temporarily allow all operations - will need authentication later)
CREATE POLICY "Allow all operations on patients" ON public.patients FOR ALL USING (true);
CREATE POLICY "Allow all operations on medicines" ON public.medicines FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales" ON public.sales FOR ALL USING (true);
CREATE POLICY "Allow all operations on sale_items" ON public.sale_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on patient_medications" ON public.patient_medications FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_patients_last_visit ON public.patients(last_visit);
CREATE INDEX idx_medicines_stock ON public.medicines(stock);
CREATE INDEX idx_medicines_expiry_date ON public.medicines(expiry_date);
CREATE INDEX idx_medicines_category ON public.medicines(category);
CREATE INDEX idx_sales_patient_id ON public.sales(patient_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_medicine_id ON public.sale_items(medicine_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicines_updated_at
    BEFORE UPDATE ON public.medicines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update patient total purchases
CREATE OR REPLACE FUNCTION public.update_patient_total_purchases()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the patient's total purchases
    UPDATE public.patients
    SET total_purchases = (
        SELECT COALESCE(SUM(total), 0)
        FROM public.sales
        WHERE patient_id = NEW.patient_id
        AND status = 'completed'
    ),
    last_visit = CURRENT_DATE
    WHERE id = NEW.patient_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to automatically update patient totals when sales are completed
CREATE TRIGGER update_patient_totals_on_sale
    AFTER INSERT OR UPDATE ON public.sales
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.update_patient_total_purchases();