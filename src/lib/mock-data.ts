// Mock data for Pivot ERP - Frontend-only mode

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  gstNumber: string;
  state: string;
  phone: string;
  email: string;
  openingBalance: number;
  currentBalance: number;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  purchasePrice: number;
  gstPercent: number;
  stockQuantity: number;
}

export interface InvoiceItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  gstPercent: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  partyId: string;
  partyName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  type: 'sale' | 'purchase';
  status: 'draft' | 'completed';
}

export const mockParties: Party[] = [
  { id: '1', name: 'ABC Electronics', type: 'customer', gstNumber: '27AABCU9603R1ZM', state: 'Maharashtra', phone: '9876543210', email: 'abc@example.com', openingBalance: 15000, currentBalance: 45000 },
  { id: '2', name: 'XYZ Traders', type: 'supplier', gstNumber: '29AADCX1234R1ZP', state: 'Karnataka', phone: '9876543211', email: 'xyz@example.com', openingBalance: -25000, currentBalance: -35000 },
  { id: '3', name: 'Metro Distributors', type: 'both', gstNumber: '07AADCM5678R1ZQ', state: 'Delhi', phone: '9876543212', email: 'metro@example.com', openingBalance: 8000, currentBalance: 12000 },
  { id: '4', name: 'Global Imports', type: 'supplier', gstNumber: '33AADCG9012R1ZR', state: 'Tamil Nadu', phone: '9876543213', email: 'global@example.com', openingBalance: -12000, currentBalance: -28000 },
  { id: '5', name: 'Sunrise Retail', type: 'customer', gstNumber: '24AADCS3456R1ZS', state: 'Gujarat', phone: '9876543214', email: 'sunrise@example.com', openingBalance: 5000, currentBalance: 22000 },
];

export const mockItems: Item[] = [
  { id: '1', name: 'Laptop Dell Inspiron', sku: 'DELL-INS-001', category: 'Electronics', salePrice: 55000, purchasePrice: 48000, gstPercent: 18, stockQuantity: 25 },
  { id: '2', name: 'HP Printer LaserJet', sku: 'HP-PRT-002', category: 'Electronics', salePrice: 18000, purchasePrice: 15000, gstPercent: 18, stockQuantity: 15 },
  { id: '3', name: 'Office Chair Premium', sku: 'FRN-CHR-001', category: 'Furniture', salePrice: 8500, purchasePrice: 6500, gstPercent: 12, stockQuantity: 40 },
  { id: '4', name: 'Wireless Mouse Logitech', sku: 'LOG-MOU-001', category: 'Accessories', salePrice: 1200, purchasePrice: 900, gstPercent: 18, stockQuantity: 100 },
  { id: '5', name: 'USB-C Hub 7-in-1', sku: 'ACC-HUB-001', category: 'Accessories', salePrice: 2500, purchasePrice: 1800, gstPercent: 18, stockQuantity: 60 },
  { id: '6', name: 'Monitor 24" Samsung', sku: 'SAM-MON-001', category: 'Electronics', salePrice: 15000, purchasePrice: 12000, gstPercent: 18, stockQuantity: 20 },
];

export const mockSalesInvoices: Invoice[] = [
  {
    id: 's1',
    invoiceNumber: 'INV-2024-001',
    date: '2024-01-15',
    partyId: '1',
    partyName: 'ABC Electronics',
    items: [
      { itemId: '1', itemName: 'Laptop Dell Inspiron', quantity: 2, price: 55000, gstPercent: 18, total: 129800 },
      { itemId: '4', itemName: 'Wireless Mouse Logitech', quantity: 5, price: 1200, gstPercent: 18, total: 7080 },
    ],
    subtotal: 116000,
    taxAmount: 20880,
    grandTotal: 136880,
    type: 'sale',
    status: 'completed',
  },
  {
    id: 's2',
    invoiceNumber: 'INV-2024-002',
    date: '2024-01-18',
    partyId: '5',
    partyName: 'Sunrise Retail',
    items: [
      { itemId: '3', itemName: 'Office Chair Premium', quantity: 10, price: 8500, gstPercent: 12, total: 95200 },
    ],
    subtotal: 85000,
    taxAmount: 10200,
    grandTotal: 95200,
    type: 'sale',
    status: 'completed',
  },
];

export const mockPurchaseInvoices: Invoice[] = [
  {
    id: 'p1',
    invoiceNumber: 'PO-2024-001',
    date: '2024-01-10',
    partyId: '2',
    partyName: 'XYZ Traders',
    items: [
      { itemId: '1', itemName: 'Laptop Dell Inspiron', quantity: 10, price: 48000, gstPercent: 18, total: 566400 },
    ],
    subtotal: 480000,
    taxAmount: 86400,
    grandTotal: 566400,
    type: 'purchase',
    status: 'completed',
  },
  {
    id: 'p2',
    invoiceNumber: 'PO-2024-002',
    date: '2024-01-12',
    partyId: '4',
    partyName: 'Global Imports',
    items: [
      { itemId: '6', itemName: 'Monitor 24" Samsung', quantity: 15, price: 12000, gstPercent: 18, total: 212400 },
      { itemId: '5', itemName: 'USB-C Hub 7-in-1', quantity: 30, price: 1800, gstPercent: 18, total: 63720 },
    ],
    subtotal: 234000,
    taxAmount: 42120,
    grandTotal: 276120,
    type: 'purchase',
    status: 'completed',
  },
];

// Dashboard KPIs
export const dashboardKPIs = {
  totalRevenue: 232080,
  totalExpense: 842520,
  todayRevenue: 45600,
  todayOrders: 8,
  outstandingReceivable: 79000,
  outstandingPayable: 63000,
};

// Monthly data for charts
export const monthlyData = [
  { month: 'Apr', income: 185000, expense: 142000 },
  { month: 'May', income: 220000, expense: 168000 },
  { month: 'Jun', income: 195000, expense: 155000 },
  { month: 'Jul', income: 248000, expense: 192000 },
  { month: 'Aug', income: 275000, expense: 210000 },
  { month: 'Sep', income: 232080, expense: 178000 },
  { month: 'Oct', income: 290000, expense: 225000 },
  { month: 'Nov', income: 310000, expense: 242000 },
  { month: 'Dec', income: 285000, expense: 218000 },
  { month: 'Jan', income: 265000, expense: 195000 },
  { month: 'Feb', income: 245000, expense: 188000 },
  { month: 'Mar', income: 298000, expense: 232000 },
];

export const topSellingProducts = [
  { name: 'Laptop Dell Inspiron', quantity: 45, revenue: 2475000 },
  { name: 'Office Chair Premium', quantity: 120, revenue: 1020000 },
  { name: 'Monitor 24" Samsung', quantity: 68, revenue: 1020000 },
  { name: 'HP Printer LaserJet', quantity: 35, revenue: 630000 },
  { name: 'USB-C Hub 7-in-1', quantity: 95, revenue: 237500 },
];

export const topCustomers = [
  { name: 'ABC Electronics', orders: 24, revenue: 1850000 },
  { name: 'Sunrise Retail', orders: 18, revenue: 1420000 },
  { name: 'Metro Distributors', orders: 15, revenue: 980000 },
];

export const topStates = [
  { state: 'Maharashtra', revenue: 2450000 },
  { state: 'Gujarat', revenue: 1820000 },
  { state: 'Karnataka', revenue: 1540000 },
  { state: 'Delhi', revenue: 1280000 },
  { state: 'Tamil Nadu', revenue: 980000 },
];

export const categories = ['Electronics', 'Furniture', 'Accessories', 'Office Supplies', 'Stationery'];

export const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const financialYears = [
  { id: 'fy2024', label: 'FY 2024-25', start: '2024-04-01', end: '2025-03-31' },
  { id: 'fy2023', label: 'FY 2023-24', start: '2023-04-01', end: '2024-03-31' },
  { id: 'fy2022', label: 'FY 2022-23', start: '2022-04-01', end: '2023-03-31' },
];
