import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Party,
  Item,
  Invoice,
  mockParties,
  mockItems,
  mockSalesInvoices,
  mockPurchaseInvoices,
  financialYears,
} from '@/lib/mock-data';

interface AppState {
  parties: Party[];
  items: Item[];
  salesInvoices: Invoice[];
  purchaseInvoices: Invoice[];
  currentFinancialYear: string;
  sidebarCollapsed: boolean;
  isCRMMode: boolean; // Track if we are in Strategic CRM Mode
}

interface AppContextType extends AppState {
  // Party actions
  addParty: (party: Omit<Party, 'id' | 'currentBalance'>) => void;
  updateParty: (id: string, party: Partial<Party>) => void;
  deleteParty: (id: string) => void;

  // Item actions
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (id: string, item: Partial<Item>) => void;
  deleteItem: (id: string) => void;

  // Invoice actions
  addSalesInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  addPurchaseInvoice: (invoice: Omit<Invoice, 'id'>) => void;

  // Settings
  setFinancialYear: (year: string) => void;
  toggleSidebar: () => void;
  toggleCRMMode: () => void;
  setIsCRMMode: (value: boolean) => void;

  // Helpers
  getPartyById: (id: string) => Party | undefined;
  getItemById: (id: string) => Item | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [parties, setParties] = useState<Party[]>(mockParties);
  const [items, setItems] = useState<Item[]>(mockItems);
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>(mockSalesInvoices);
  const [purchaseInvoices, setPurchaseInvoices] = useState<Invoice[]>(mockPurchaseInvoices);

  const [currentFinancialYear, setCurrentFinancialYear] = useState(financialYears[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize CRM Mode from localStorage if present
  const [isCRMMode, setIsCRMModeState] = useState(() => {
    return localStorage.getItem('isCRMMode') === 'true';
  });

  const setIsCRMMode = useCallback((value: boolean) => {
    setIsCRMModeState(value);
    localStorage.setItem('isCRMMode', value.toString());
  }, []);

  const toggleCRMMode = useCallback(() => {
    setIsCRMModeState(prev => {
      const newValue = !prev;
      localStorage.setItem('isCRMMode', newValue.toString());
      return newValue;
    });
  }, []);

  // Party actions
  const addParty = useCallback((party: Omit<Party, 'id' | 'currentBalance'>) => {
    const newParty: Party = {
      ...party,
      id: `party-${Date.now()}`,
      currentBalance: party.openingBalance,
    };
    setParties((prev) => [...prev, newParty]);
  }, []);

  const updateParty = useCallback((id: string, updates: Partial<Party>) => {
    setParties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deleteParty = useCallback((id: string) => {
    setParties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Item actions
  const addItem = useCallback((item: Omit<Item, 'id'>) => {
    const newItem: Item = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Item>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Invoice actions
  const addSalesInvoice = useCallback((invoice: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: `sale-${Date.now()}`,
    };
    setSalesInvoices((prev) => [...prev, newInvoice]);

    // Update stock
    invoice.items.forEach((item) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.itemId
            ? { ...i, stockQuantity: i.stockQuantity - item.quantity }
            : i
        )
      );
    });

    // Update party balance
    setParties((prev) =>
      prev.map((p) =>
        p.id === invoice.partyId
          ? { ...p, currentBalance: p.currentBalance + invoice.grandTotal }
          : p
      )
    );
  }, []);

  const addPurchaseInvoice = useCallback((invoice: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: `purchase-${Date.now()}`,
    };
    setPurchaseInvoices((prev) => [...prev, newInvoice]);

    // Update stock
    invoice.items.forEach((item) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.itemId
            ? { ...i, stockQuantity: i.stockQuantity + item.quantity }
            : i
        )
      );
    });

    // Update party balance
    setParties((prev) =>
      prev.map((p) =>
        p.id === invoice.partyId
          ? { ...p, currentBalance: p.currentBalance - invoice.grandTotal }
          : p
      )
    );
  }, []);

  // Settings
  const setFinancialYear = useCallback((year: string) => {
    setCurrentFinancialYear(year);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Helpers
  const getPartyById = useCallback(
    (id: string) => parties.find((p) => p.id === id),
    [parties]
  );

  const getItemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items]
  );

  return (
    <AppContext.Provider
      value={{
        parties,
        items,
        salesInvoices,
        purchaseInvoices,
        currentFinancialYear,
        sidebarCollapsed,
        addParty,
        updateParty,
        deleteParty,
        addItem,
        updateItem,
        deleteItem,
        addSalesInvoice,
        addPurchaseInvoice,
        setFinancialYear,
        toggleSidebar,
        getPartyById,
        getItemById,
        isCRMMode,
        toggleCRMMode,
        setIsCRMMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
