import { supabase } from '@/integrations/supabase/client';

export const generateDummyData = async () => {
  try {
    // Check if data already exists
    const { data: existingMedicines } = await supabase
      .from('medicines')
      .select('id')
      .limit(1);

    if (existingMedicines && existingMedicines.length > 0) {
      console.log('Dummy data already exists');
      return { success: true, message: 'Data already exists' };
    }

    // Generate 100 medicines
    const medicineNames = [
      'Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Cetirizine', 'Vitamin C',
      'Azithromycin', 'Metformin', 'Atorvastatin', 'Omeprazole', 'Aspirin',
      'Losartan', 'Amlodipine', 'Clopidogrel', 'Pantoprazole', 'Ranitidine',
      'Diclofenac', 'Cefixime', 'Ciprofloxacin', 'Levofloxacin', 'Doxycycline',
      'Prednisolone', 'Dexamethasone', 'Montelukast', 'Salbutamol', 'Fluticasone',
      'Insulin', 'Glimepiride', 'Gliclazide', 'Pioglitazone', 'Sitagliptin'
    ];
    
    const manufacturers = ['Sun Pharma', 'Cipla', 'Dr. Reddy\'s', 'Ranbaxy', 'Himalaya', 'Lupin', 'Torrent', 'Alkem', 'Abbott', 'Zydus'];
    const categories = ['Analgesic', 'Antibiotic', 'NSAID', 'Antihistamine', 'Vitamin', 'Antidiabetic', 'Cardiac', 'Antiulcer', 'Steroid', 'Respiratory'];
    
    const medicines = Array.from({ length: 100 }, (_, i) => {
      const baseName = medicineNames[i % medicineNames.length];
      const dosage = [250, 500, 1000][Math.floor(Math.random() * 3)];
      const price = parseFloat((Math.random() * 50 + 5).toFixed(2));
      return {
        name: `${baseName} ${dosage}mg`,
        generic_name: baseName,
        manufacturer: manufacturers[i % manufacturers.length],
        category: categories[i % categories.length],
        stock: Math.floor(Math.random() * 200) + 50,
        min_stock: Math.floor(Math.random() * 20) + 10,
        price: price,
        mrp: parseFloat((price * 1.1).toFixed(2)),
        expiry_date: new Date(2025 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
        batch_number: `BATCH${String(i + 1).padStart(3, '0')}`,
        hsn_code: '3004',
        gst_rate: 12
      };
    });

    const { data: insertedMedicines, error: medError } = await supabase
      .from('medicines')
      .insert(medicines)
      .select();

    if (medError) throw medError;

    // Generate patients
    const patients = [
      {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh@example.com'
      },
      {
        name: 'Priya Sharma',
        phone: '9876543211',
        email: 'priya@example.com'
      },
      {
        name: 'Amit Patel',
        phone: '9876543212',
        email: 'amit@example.com'
      }
    ];

    const { data: insertedPatients, error: patError } = await supabase
      .from('patients')
      .insert(patients)
      .select();

    if (patError) throw patError;

    // Generate sample sales
    if (insertedPatients && insertedMedicines && insertedPatients.length > 0 && insertedMedicines.length >= 2) {
      const sale = {
        patient_id: insertedPatients[0].id,
        patient_name: insertedPatients[0].name,
        total: 33.25,
        payment_method: 'cash' as const,
        status: 'completed' as const
      };

      const { data: insertedSale, error: saleError } = await supabase
        .from('sales')
        .insert([sale])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = [
        {
          sale_id: insertedSale.id,
          medicine_id: insertedMedicines[0].id,
          medicine_name: insertedMedicines[0].name,
          quantity: 2,
          price: 5.50,
          total: 11.00
        },
        {
          sale_id: insertedSale.id,
          medicine_id: insertedMedicines[1].id,
          medicine_name: insertedMedicines[1].name,
          quantity: 1,
          price: 15.00,
          total: 15.00
        },
        {
          sale_id: insertedSale.id,
          medicine_id: insertedMedicines[3].id,
          medicine_name: insertedMedicines[3].name,
          quantity: 2,
          price: 3.25,
          total: 6.50
        }
      ];

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;
    }

    return { 
      success: true, 
      message: `Generated ${medicines.length} medicines, ${patients.length} patients, and 1 sample sale` 
    };
  } catch (error) {
    console.error('Error generating dummy data:', error);
    return { success: false, error };
  }
};