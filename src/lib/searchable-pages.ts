import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Receipt,
    BookOpen,
    BarChart3,
    ShieldCheck,
    Layers,
    Tags,
    Boxes,
    Award,
    FileText,
    ClipboardList,
    Truck,
    FilePlus,
    Calculator,
    CreditCard,
    ArrowDownCircle,
    ArrowUpCircle,
    Wallet,
    FileCheck,
    PenLine,
    HandCoins,
    TrendingUp,
    PieChart,
    MapPin,
    Settings,
    Warehouse,
    PackageCheck,
    Hash,
    Percent,
    Folder,
    ListTree,
    BookMarked,
    Stamp,
    PackageOpen,
    Archive,
    LucideIcon,
} from 'lucide-react';

export interface SearchablePage {
    title: string;
    href: string;
    icon: LucideIcon;
    keywords: string[];
    category: string;
}

export const searchablePages: SearchablePage[] = [
    // Main
    {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        keywords: ['home', 'overview', 'main', 'stats', 'analytics'],
        category: 'Main'
    },
    {
        title: 'Party Master',
        href: '/parties',
        icon: Users,
        keywords: ['customers', 'vendors', 'suppliers', 'contacts', 'clients'],
        category: 'Main'
    },

    // Item Master
    {
        title: 'Item Category',
        href: '/items/categories',
        icon: Layers,
        keywords: ['product category', 'item type', 'classification'],
        category: 'Item Master'
    },
    {
        title: 'Products',
        href: '/items/products',
        icon: Boxes,
        keywords: ['items', 'inventory', 'goods', 'stock'],
        category: 'Item Master'
    },
    {
        title: 'Service Items',
        href: '/items/services',
        icon: Tags,
        keywords: ['services', 'service items'],
        category: 'Item Master'
    },
    {
        title: 'Brand Master',
        href: '/items/brands',
        icon: Award,
        keywords: ['brands', 'manufacturers'],
        category: 'Item Master'
    },

    // Purchase
    {
        title: 'Purchase Order',
        href: '/purchase-orders',
        icon: ClipboardList,
        keywords: ['po', 'buy', 'procurement', 'order'],
        category: 'Purchase'
    },
    {
        title: 'Purchase Invoice',
        href: '/purchase/invoice',
        icon: Receipt,
        keywords: ['purchase bill', 'vendor invoice', 'buy invoice'],
        category: 'Purchase'
    },

    // Sales
    {
        title: 'Sales Enquiry',
        href: '/sales/enquiry',
        icon: FileText,
        keywords: ['inquiry', 'lead', 'prospect', 'rfq'],
        category: 'Sales'
    },
    {
        title: 'Sales Quotation',
        href: '/sales/quotation',
        icon: FilePlus,
        keywords: ['quote', 'proposal', 'estimate', 'proforma'],
        category: 'Sales'
    },
    {
        title: 'Sales Order',
        href: '/sales/order',
        icon: ClipboardList,
        keywords: ['so', 'sell', 'order'],
        category: 'Sales'
    },
    {
        title: 'Delivery Challan',
        href: '/sales/challan',
        icon: Truck,
        keywords: ['dc', 'dispatch', 'shipment', 'delivery note'],
        category: 'Sales'
    },
    {
        title: 'Price Structure',
        href: '/sales/price-structure',
        icon: Tags,
        keywords: ['pricing', 'rate', 'cost'],
        category: 'Sales'
    },
    {
        title: 'Sales Zone',
        href: '/sales/zones',
        icon: MapPin,
        keywords: ['territory', 'area', 'region'],
        category: 'Sales'
    },

    // Store
    {
        title: 'Store Location',
        href: '/store/location',
        icon: MapPin,
        keywords: ['warehouse', 'godown', 'storage'],
        category: 'Store'
    },
    {
        title: 'Gate Inward',
        href: '/store/gate-inward',
        icon: PackageCheck,
        keywords: ['grn', 'goods receipt', 'inward', 'receiving'],
        category: 'Store'
    },
    {
        title: 'Marking',
        href: '/store/marking',
        icon: Stamp,
        keywords: ['label', 'tag', 'mark'],
        category: 'Store'
    },
    {
        title: 'Packing',
        href: '/store/packing',
        icon: PackageOpen,
        keywords: ['pack', 'packaging', 'box'],
        category: 'Store'
    },
    {
        title: 'Opening Stock',
        href: '/store/opening-stock',
        icon: Archive,
        keywords: ['initial stock', 'beginning inventory'],
        category: 'Store'
    },

    // Accounting
    {
        title: 'Ledger',
        href: '/accounting/ledger',
        icon: BookOpen,
        keywords: ['account', 'book', 'ledger account'],
        category: 'Accounting'
    },
    {
        title: 'Debit Note',
        href: '/accounting/debit-note',
        icon: ArrowUpCircle,
        keywords: ['dn', 'purchase return'],
        category: 'Accounting'
    },
    {
        title: 'Tax Invoice',
        href: '/sales/tax-invoice',
        icon: FileCheck,
        keywords: ['sales invoice', 'bill', 'gst invoice'],
        category: 'Sales'
    },
    {
        title: 'Credit Note',
        href: '/accounting/credit-note',
        icon: ArrowDownCircle,
        keywords: ['cn', 'sales return', 'refund'],
        category: 'Accounting'
    },
    {
        title: 'GST Expense',
        href: '/accounting/gst-expense',
        icon: Calculator,
        keywords: ['input gst', 'tax expense'],
        category: 'Accounting'
    },
    {
        title: 'GST Income',
        href: '/accounting/gst-income',
        icon: CreditCard,
        keywords: ['output gst', 'tax income'],
        category: 'Accounting'
    },
    {
        title: 'GST Payment',
        href: '/accounting/gst-payment',
        icon: Wallet,
        keywords: ['tax payment', 'gst challan'],
        category: 'Accounting'
    },
    {
        title: 'TCS/TDS Payment',
        href: '/accounting/tcs-tds-payment',
        icon: HandCoins,
        keywords: ['tax deduction', 'withholding tax'],
        category: 'Accounting'
    },
    {
        title: 'Journal Entry',
        href: '/accounting/journal-entry',
        icon: PenLine,
        keywords: ['je', 'journal voucher', 'adjustment'],
        category: 'Accounting'
    },
    {
        title: 'Payment Voucher',
        href: '/accounting/payment-voucher',
        icon: FileText,
        keywords: ['payment', 'pay', 'expense'],
        category: 'Accounting'
    },
    {
        title: 'Receivables',
        href: '/accounting/receivables',
        icon: ArrowDownCircle,
        keywords: ['outstanding', 'dues', 'pending payments'],
        category: 'Accounting'
    },
    {
        title: 'Payables',
        href: '/accounting/payables',
        icon: ArrowUpCircle,
        keywords: ['bills payable', 'vendor dues'],
        category: 'Accounting'
    },

    // Reports
    {
        title: 'Sales Report',
        href: '/reports/sales',
        icon: TrendingUp,
        keywords: ['sales analysis', 'revenue report'],
        category: 'Reports'
    },
    {
        title: 'Purchase Report',
        href: '/reports/purchase',
        icon: ShoppingCart,
        keywords: ['purchase analysis', 'buying report'],
        category: 'Reports'
    },
    {
        title: 'Top Customers',
        href: '/reports/customers',
        icon: Users,
        keywords: ['customer analysis', 'client report'],
        category: 'Reports'
    },
    {
        title: 'Top Products',
        href: '/reports/products',
        icon: PieChart,
        keywords: ['product analysis', 'item report'],
        category: 'Reports'
    },
    {
        title: 'State-wise Sales',
        href: '/reports/states',
        icon: MapPin,
        keywords: ['regional sales', 'geography report'],
        category: 'Reports'
    },

    // Configuration
    {
        title: 'Terms',
        href: '/config/terms',
        icon: FileText,
        keywords: ['terms and conditions', 'tnc'],
        category: 'Configuration'
    },
    {
        title: 'Transport',
        href: '/config/transport',
        icon: Truck,
        keywords: ['transporter', 'logistics', 'carrier'],
        category: 'Configuration'
    },
    {
        title: 'HSN Master',
        href: '/config/hsn',
        icon: Hash,
        keywords: ['hsn code', 'harmonized system'],
        category: 'Configuration'
    },
    {
        title: 'Tax Master',
        href: '/config/tax',
        icon: Percent,
        keywords: ['gst rate', 'tax rate'],
        category: 'Configuration'
    },
    {
        title: 'Expense Master',
        href: '/config/expense',
        icon: Receipt,
        keywords: ['expense category', 'cost type'],
        category: 'Configuration'
    },
    {
        title: 'Group Master',
        href: '/config/group',
        icon: Folder,
        keywords: ['account group', 'ledger group'],
        category: 'Configuration'
    },
    {
        title: 'Tax Class',
        href: '/config/tax-class',
        icon: ListTree,
        keywords: ['tax classification', 'gst class'],
        category: 'Configuration'
    },
    {
        title: 'Voucher Prefix',
        href: '/config/voucher-prefix',
        icon: BookMarked,
        keywords: ['numbering', 'series', 'prefix'],
        category: 'Configuration'
    },

    // Tools
    {
        title: 'User Management',
        href: '/admin/users',
        icon: ShieldCheck,
        keywords: ['users', 'roles', 'permissions', 'admin'],
        category: 'Tools'
    },
    {
        title: 'My Profile',
        href: '/profile',
        icon: Settings,
        keywords: ['settings', 'account', 'company', 'preferences'],
        category: 'Tools'
    },
];

export function searchPages(query: string): SearchablePage[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const lowerQuery = trimmedQuery.toLowerCase();
    const results: SearchablePage[] = [];

    // Use for loop for maximum performance
    for (let i = 0; i < searchablePages.length && results.length < 8; i++) {
        const page = searchablePages[i];

        // Check title (most common match)
        if (page.title.toLowerCase().includes(lowerQuery)) {
            results.push(page);
            continue;
        }

        // Check keywords
        let keywordMatch = false;
        for (let j = 0; j < page.keywords.length; j++) {
            if (page.keywords[j].includes(lowerQuery)) {
                keywordMatch = true;
                break;
            }
        }

        if (keywordMatch) {
            results.push(page);
            continue;
        }

        // Check category (least common)
        if (page.category.toLowerCase().includes(lowerQuery)) {
            results.push(page);
        }
    }

    return results;
}
