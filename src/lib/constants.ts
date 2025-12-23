// Indian States
export const INDIAN_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry',
] as const;

export type IndianState = typeof INDIAN_STATES[number];

// GST Rates - Customizable by admin/distributor
export const DEFAULT_GST_RATES = [0, 5, 12, 18, 28] as const;

// Common Units
export const UNITS = [
    { value: 'PCS', label: 'Pieces' },
    { value: 'BOX', label: 'Box' },
    { value: 'KG', label: 'Kilograms' },
    { value: 'GM', label: 'Grams' },
    { value: 'LTR', label: 'Litres' },
    { value: 'MTR', label: 'Meters' },
    { value: 'SQM', label: 'Square Meters' },
    { value: 'SET', label: 'Set' },
    { value: 'DOZ', label: 'Dozen' },
    { value: 'PKT', label: 'Packet' },
    { value: 'BAG', label: 'Bag' },
    { value: 'ROLL', label: 'Roll' },
] as const;

export type Unit = typeof UNITS[number]['value'];

// Payment Modes
export const PAYMENT_MODES = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
] as const;

// Invoice Types
export const INVOICE_TYPES = {
    sale: { label: 'Sales Invoice', prefix: 'INV' },
    purchase: { label: 'Purchase Order', prefix: 'PO' },
    sale_return: { label: 'Sales Return', prefix: 'SR' },
    purchase_return: { label: 'Purchase Return', prefix: 'PR' },
} as const;

// Date Formats
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Currency
export const CURRENCY = {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
} as const;

/**
 * Format number as Indian currency
 */
export function formatCurrency(amount: number, showSymbol = true): string {
    const formatted = new Intl.NumberFormat(CURRENCY.locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: CURRENCY.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format number with Indian number system (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
    return new Intl.NumberFormat(CURRENCY.locale).format(num);
}

/**
 * Calculate GST amounts based on seller and buyer states
 */
export function calculateGST(
    taxableAmount: number,
    gstPercent: number,
    sellerState: string,
    buyerState: string
): {
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
} {
    const totalTax = (taxableAmount * gstPercent) / 100;

    if (sellerState === buyerState) {
        // Intra-state: Split into CGST and SGST
        const halfTax = totalTax / 2;
        return {
            cgst: Math.round(halfTax * 100) / 100,
            sgst: Math.round(halfTax * 100) / 100,
            igst: 0,
            totalTax: Math.round(totalTax * 100) / 100,
        };
    } else {
        // Inter-state: Full IGST
        return {
            cgst: 0,
            sgst: 0,
            igst: Math.round(totalTax * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
        };
    }
}

/**
 * Round amount to nearest rupee
 */
export function roundOff(amount: number): { roundedAmount: number; roundOffValue: number } {
    const roundedAmount = Math.round(amount);
    const roundOffValue = roundedAmount - amount;
    return {
        roundedAmount,
        roundOffValue: Math.round(roundOffValue * 100) / 100,
    };
}

/**
 * Financial Years
 */
export function getFinancialYears(count = 3): { id: string; label: string; start: string; end: string }[] {
    const years = [];
    const now = new Date();
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    for (let i = 0; i < count; i++) {
        const startYear = currentYear - i;
        const endYear = startYear + 1;
        years.push({
            id: `fy${startYear}`,
            label: `FY ${startYear}-${endYear.toString().slice(-2)}`,
            start: `${startYear}-04-01`,
            end: `${endYear}-03-31`,
        });
    }

    return years;
}

/**
 * Get current financial year
 */
export function getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `fy${year}`;
}
