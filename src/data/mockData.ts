// Mock data for KP Medical Shop Management System

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalPurchases: number;
  lastVisit: string;
  medications: string[];
}

export interface Sale {
  id: string;
  patientId: string;
  patientName: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  timestamp: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  expiryDate: string;
  batchNumber: string;
  location: string;
}

export interface DashboardStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalPatients: number;
  lowStockItems: number;
  expiringItems: number;
  pendingOrders: number;
  cashInHand: number;
}

// Mock Dashboard Statistics
export const dashboardStats: DashboardStats = {
  todaySales: 12450,
  weekSales: 87300,
  monthSales: 342150,
  totalPatients: 1245,
  lowStockItems: 23,
  expiringItems: 8,
  pendingOrders: 15,
  cashInHand: 45600,
};

// Mock Sales Data for Charts
export const salesChartData = [
  { day: 'Mon', sales: 12000, patients: 45 },
  { day: 'Tue', sales: 15800, patients: 52 },
  { day: 'Wed', sales: 14200, patients: 48 },
  { day: 'Thu', sales: 16900, patients: 58 },
  { day: 'Fri', sales: 18200, patients: 62 },
  { day: 'Sat', sales: 21500, patients: 78 },
  { day: 'Sun', sales: 19400, patients: 65 },
];

export const monthlyData = [
  { month: 'Jan', sales: 245000, patients: 1200 },
  { month: 'Feb', sales: 267000, patients: 1350 },
  { month: 'Mar', sales: 289000, patients: 1420 },
  { month: 'Apr', sales: 312000, patients: 1580 },
  { month: 'May', sales: 298000, patients: 1465 },
  { month: 'Jun', sales: 342150, patients: 1685 },
];

// Mock Recent Patients
export const recentPatients: Patient[] = [
  {
    id: 'P001',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@email.com',
    totalPurchases: 8450,
    lastVisit: '2024-01-15',
    medications: ['Paracetamol 500mg', 'Crocin Advance', 'Vitamin D3'],
  },
  {
    id: 'P002',
    name: 'Priya Sharma',
    phone: '+91 87654 32109',
    email: 'priya.sharma@email.com',
    totalPurchases: 12300,
    lastVisit: '2024-01-14',
    medications: ['Insulin Glargine', 'Metformin 500mg', 'Glucometer Strips'],
  },
  {
    id: 'P003',
    name: 'Amit Patel',
    phone: '+91 76543 21098',
    totalPurchases: 3200,
    lastVisit: '2024-01-14',
    medications: ['Amoxicillin 500mg', 'Cetirizine 10mg'],
  },
  {
    id: 'P004',
    name: 'Sunita Devi',
    phone: '+91 65432 10987',
    totalPurchases: 5670,
    lastVisit: '2024-01-13',
    medications: ['Atorvastatin 20mg', 'Amlodipine 5mg', 'Aspirin 75mg'],
  },
];

// Mock Recent Sales
export const recentSales: Sale[] = [
  {
    id: 'S001',
    patientId: 'P001',
    patientName: 'Rajesh Kumar',
    items: [
      { id: 'M001', name: 'Paracetamol 500mg', quantity: 2, price: 15, total: 30 },
      { id: 'M002', name: 'Crocin Advance', quantity: 1, price: 25, total: 25 },
    ],
    total: 55,
    paymentMethod: 'cash',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'completed',
  },
  {
    id: 'S002',
    patientId: 'P002',
    patientName: 'Priya Sharma',
    items: [
      { id: 'M003', name: 'Insulin Glargine', quantity: 1, price: 450, total: 450 },
      { id: 'M004', name: 'Glucometer Strips', quantity: 1, price: 350, total: 350 },
    ],
    total: 800,
    paymentMethod: 'card',
    timestamp: '2024-01-15T09:15:00Z',
    status: 'completed',
  },
];

// Mock Low Stock Items
export const lowStockItems: Medicine[] = [
  {
    id: 'M005',
    name: 'Azithromycin 500mg',
    genericName: 'Azithromycin',
    manufacturer: 'Cipla Ltd',
    category: 'Antibiotic',
    stock: 5,
    minStock: 20,
    price: 85,
    expiryDate: '2025-06-15',
    batchNumber: 'AZ001',
    location: 'A-2-15',
  },
  {
    id: 'M006',
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    manufacturer: 'Dr. Reddy\'s',
    category: 'Gastro',
    stock: 8,
    minStock: 25,
    price: 45,
    expiryDate: '2025-08-20',
    batchNumber: 'OM002',
    location: 'B-1-08',
  },
];

// Mock Expiring Items
export const expiringItems: Medicine[] = [
  {
    id: 'M007',
    name: 'Amoxicillin 250mg',
    genericName: 'Amoxicillin',
    manufacturer: 'Sun Pharma',
    category: 'Antibiotic',
    stock: 25,
    minStock: 15,
    price: 35,
    expiryDate: '2024-02-28',
    batchNumber: 'AM003',
    location: 'A-1-12',
  },
];