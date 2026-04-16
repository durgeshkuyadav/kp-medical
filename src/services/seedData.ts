import { supabase } from '@/integrations/supabase/client';

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Check if data already exists
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log('Database already contains data, skipping seeding.');
      return;
    }

    // Insert patients
    const patientsData = [
      {
        name: 'Rajesh Kumar',
        phone: '+91 98765 43210',
        email: 'rajesh.kumar@email.com'
      },
      {
        name: 'Priya Sharma',
        phone: '+91 87654 32109',
        email: 'priya.sharma@email.com'
      },
      {
        name: 'Amit Patel',
        phone: '+91 76543 21098'
      },
      {
        name: 'Sunita Devi',
        phone: '+91 65432 10987'
      }
    ];

    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .insert(patientsData)
      .select();

    if (patientsError) throw patientsError;
    console.log('Patients inserted successfully');

    // Insert medicines
    const medicinesData = [
      {
        name: 'Paracetamol 500mg',
        generic_name: 'Paracetamol',
        manufacturer: 'Sun Pharma',
        category: 'Analgesic',
        stock: 100,
        min_stock: 20,
        price: 15.00,
        mrp: 18.00,
        expiry_date: '2025-12-31',
        batch_number: 'PC001',
        hsn_code: '3004',
        gst_rate: 12
      },
      {
        name: 'Crocin Advance',
        generic_name: 'Paracetamol',
        manufacturer: 'GSK',
        category: 'Analgesic',
        stock: 80,
        min_stock: 15,
        price: 25.00,
        mrp: 30.00,
        expiry_date: '2025-10-15',
        batch_number: 'CR002',
        hsn_code: '3004',
        gst_rate: 12
      },
      {
        name: 'Insulin Glargine',
        generic_name: 'Insulin Glargine',
        manufacturer: 'Sanofi',
        category: 'Diabetes',
        stock: 25,
        min_stock: 5,
        price: 450.00,
        mrp: 500.00,
        expiry_date: '2025-08-20',
        batch_number: 'IN003',
        hsn_code: '3004',
        gst_rate: 12
      },
      {
        name: 'Glucometer Strips',
        generic_name: 'Blood Glucose Test Strips',
        manufacturer: 'Accu-Chek',
        category: 'Diabetes',
        stock: 50,
        min_stock: 10,
        price: 350.00,
        mrp: 400.00,
        expiry_date: '2025-06-30',
        batch_number: 'GL004',
        hsn_code: '3822',
        gst_rate: 12
      },
      {
        name: 'Azithromycin 500mg',
        generic_name: 'Azithromycin',
        manufacturer: 'Cipla Ltd',
        category: 'Antibiotic',
        stock: 5,
        min_stock: 20,
        price: 85.00,
        mrp: 95.00,
        expiry_date: '2025-06-15',
        batch_number: 'AZ001',
        hsn_code: '3004',
        gst_rate: 12
      },
      {
        name: 'Omeprazole 20mg',
        generic_name: 'Omeprazole',
        manufacturer: 'Dr. Reddy\'s',
        category: 'Gastro',
        stock: 8,
        min_stock: 25,
        price: 45.00,
        mrp: 50.00,
        expiry_date: '2025-08-20',
        batch_number: 'OM002',
        hsn_code: '3004',
        gst_rate: 12
      },
      {
        name: 'Amoxicillin 250mg',
        generic_name: 'Amoxicillin',
        manufacturer: 'Sun Pharma',
        category: 'Antibiotic',
        stock: 25,
        min_stock: 15,
        price: 35.00,
        mrp: 40.00,
        expiry_date: '2024-02-28',
        batch_number: 'AM003',
        hsn_code: '3004',
        gst_rate: 12
      }
    ];

    const { data: medicines, error: medicinesError } = await supabase
      .from('medicines')
      .insert(medicinesData)
      .select();

    if (medicinesError) throw medicinesError;
    console.log('Medicines inserted successfully');

    // Insert some sample sales (without patient_medications which doesn't exist)
    if (patients && patients.length > 0 && medicines && medicines.length > 0) {
      const salesData = [
        {
          patient_id: patients[0].id,
          patient_name: patients[0].name,
          total: 55.00,
          payment_method: 'cash' as const,
          status: 'completed' as const
        },
        {
          patient_id: patients[1].id,
          patient_name: patients[1].name,
          total: 800.00,
          payment_method: 'card' as const,
          status: 'completed' as const
        }
      ];

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .insert(salesData)
        .select();

      if (salesError) throw salesError;
      console.log('Sales inserted successfully');

      // Insert sale items
      if (sales && sales.length > 0) {
        const saleItemsData = [
          {
            sale_id: sales[0].id,
            medicine_id: medicines[0].id,
            medicine_name: medicines[0].name,
            quantity: 2,
            price: 15.00,
            total: 30.00
          },
          {
            sale_id: sales[0].id,
            medicine_id: medicines[1].id,
            medicine_name: medicines[1].name,
            quantity: 1,
            price: 25.00,
            total: 25.00
          },
          {
            sale_id: sales[1].id,
            medicine_id: medicines[2].id,
            medicine_name: medicines[2].name,
            quantity: 1,
            price: 450.00,
            total: 450.00
          },
          {
            sale_id: sales[1].id,
            medicine_id: medicines[3].id,
            medicine_name: medicines[3].name,
            quantity: 1,
            price: 350.00,
            total: 350.00
          }
        ];

        const { error: saleItemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (saleItemsError) throw saleItemsError;
        console.log('Sale items inserted successfully');
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};