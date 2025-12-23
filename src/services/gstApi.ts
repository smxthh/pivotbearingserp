/**
 * GST API Integration Service
 * 
 * This service integrates with GST APIs to fetch business details from GSTIN
 * Multiple API providers are supported with fallback mechanism
 */

export interface GSTDetails {
    gstin: string;
    legalName: string;
    tradeName: string;
    registrationDate: string;
    constitutionOfBusiness: string;
    taxpayerType: string;
    status: string;
    address: {
        building: string;
        street: string;
        location: string;
        district: string;
        state: string;
        pincode: string;
        latitude?: string;
        longitude?: string;
    };
    principalPlaceOfBusiness: {
        building: string;
        street: string;
        location: string;
        district: string;
        state: string;
        pincode: string;
    };
    additionalPlacesOfBusiness?: Array<{
        building: string;
        street: string;
        location: string;
        district: string;
        state: string;
        pincode: string;
    }>;
    filingStatus?: Array<{
        financialYear: string;
        taxPeriod: string;
        filingDate: string;
        status: string;
    }>;
}

export interface GSTApiResponse {
    success: boolean;
    data?: GSTDetails;
    error?: string;
    message?: string;
}

// State code to state name mapping
const STATE_CODES: Record<string, string> = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman and Diu',
    '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra',
    '28': 'Andhra Pradesh',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory',
    '99': 'Centre Jurisdiction',
};

/**
 * Validates GSTIN format
 */
export function validateGSTIN(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;

    // GSTIN format: 22AAAAA0000A1Z5
    // First 2 digits: State code
    // Next 10 characters: PAN
    // 13th character: Entity number (1-9, A-Z)
    // 14th character: Z (default)
    // 15th character: Check digit

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
}

/**
 * Extracts PAN from GSTIN
 */
export function extractPANFromGSTIN(gstin: string): string {
    if (!validateGSTIN(gstin)) return '';
    return gstin.substring(2, 12);
}

/**
 * Extracts state code from GSTIN
 */
export function extractStateFromGSTIN(gstin: string): string {
    if (!validateGSTIN(gstin)) return '';
    const stateCode = gstin.substring(0, 2);
    return STATE_CODES[stateCode] || '';
}

/**
 * Method 1: Using GST Public Search API (Official - Free but limited)
 * This is the official GST portal search API
 */
async function fetchFromGSTPortal(gstin: string): Promise<GSTApiResponse> {
    try {
        // Note: The official GST portal doesn't have a public API
        // This is a placeholder for when/if they release one
        // For now, we'll return a structured response based on GSTIN parsing

        throw new Error('Official GST Portal API not available for public use');
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch from GST Portal',
        };
    }
}

/**
 * Method 2: Using Third-party GST API (Recommended)
 * Popular providers: MasterGST, GST API, KnowYourGST, etc.
 * 
 * You'll need to sign up for an API key from one of these providers:
 * - MasterGST: https://mastergst.com/
 * - GST API: https://gstapi.charteredinfo.com/
 * - KnowYourGST: https://knowyourgst.com/
 */
async function fetchFromThirdPartyAPI(gstin: string): Promise<GSTApiResponse> {
    try {
        // Example using a generic third-party API structure
        // Replace with your actual API endpoint and key

        const API_KEY = import.meta.env.VITE_GST_API_KEY || '';
        const API_ENDPOINT = import.meta.env.VITE_GST_API_ENDPOINT || '';

        if (!API_KEY || !API_ENDPOINT) {
            throw new Error('GST API credentials not configured');
        }

        const response = await fetch(`${API_ENDPOINT}/search/${gstin}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform the response to our standard format
        // Note: This structure will vary based on your API provider
        return {
            success: true,
            data: {
                gstin: data.gstin || gstin,
                legalName: data.legalName || data.legal_name || '',
                tradeName: data.tradeName || data.trade_name || '',
                registrationDate: data.registrationDate || data.registration_date || '',
                constitutionOfBusiness: data.constitutionOfBusiness || '',
                taxpayerType: data.taxpayerType || '',
                status: data.status || 'Active',
                address: {
                    building: data.pradr?.bno || '',
                    street: data.pradr?.st || '',
                    location: data.pradr?.loc || '',
                    district: data.pradr?.dst || '',
                    state: data.pradr?.stcd ? STATE_CODES[data.pradr.stcd] || '' : '',
                    pincode: data.pradr?.pncd || '',
                },
                principalPlaceOfBusiness: {
                    building: data.pradr?.bno || '',
                    street: data.pradr?.st || '',
                    location: data.pradr?.loc || '',
                    district: data.pradr?.dst || '',
                    state: data.pradr?.stcd ? STATE_CODES[data.pradr.stcd] || '' : '',
                    pincode: data.pradr?.pncd || '',
                },
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch from third-party API',
        };
    }
}

/**
 * Method 3: Fallback - Extract basic info from GSTIN structure
 */
function extractBasicInfoFromGSTIN(gstin: string): GSTApiResponse {
    if (!validateGSTIN(gstin)) {
        return {
            success: false,
            error: 'Invalid GSTIN format',
        };
    }

    const stateCode = gstin.substring(0, 2);
    const pan = gstin.substring(2, 12);
    const state = STATE_CODES[stateCode] || '';

    return {
        success: true,
        data: {
            gstin: gstin,
            legalName: '',
            tradeName: '',
            registrationDate: '',
            constitutionOfBusiness: '',
            taxpayerType: '',
            status: 'Unknown',
            address: {
                building: '',
                street: '',
                location: '',
                district: '',
                state: state,
                pincode: '',
            },
            principalPlaceOfBusiness: {
                building: '',
                street: '',
                location: '',
                district: '',
                state: state,
                pincode: '',
            },
        },
        message: `Basic info extracted. PAN: ${pan}, State: ${state}`,
    };
}

/**
 * Main function to fetch GST details with fallback mechanism
 */
export async function fetchGSTDetails(gstin: string): Promise<GSTApiResponse> {
    // Validate GSTIN format first
    if (!validateGSTIN(gstin)) {
        return {
            success: false,
            error: 'Invalid GSTIN format. Please enter a valid 15-character GSTIN.',
        };
    }

    // Try third-party API first (if configured)
    try {
        const result = await fetchFromThirdPartyAPI(gstin);
        if (result.success && result.data) {
            return result;
        }
    } catch (error) {
        console.warn('Third-party GST API failed, trying fallback...', error);
    }

    // Fallback: Extract basic info from GSTIN structure
    return extractBasicInfoFromGSTIN(gstin);
}

/**
 * Format address from GST details
 */
export function formatGSTAddress(address: GSTDetails['address']): string {
    const parts = [
        address.building,
        address.street,
        address.location,
    ].filter(Boolean);

    return parts.join(', ');
}

/**
 * Get full address including district, state, pincode
 */
export function getFullAddress(address: GSTDetails['address']): {
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
} {
    return {
        addressLine: formatGSTAddress(address),
        district: address.district,
        state: address.state,
        pincode: address.pincode,
    };
}
