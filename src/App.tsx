import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";

// Pages
import Auth from "@/pages/Auth";
import PendingVerification from "@/pages/PendingVerification";
import Dashboard from "@/pages/Dashboard";
import DistributorSetup from "@/pages/DistributorSetup";
import PartyList from "@/pages/parties/PartyList";
import PartyForm from "@/pages/parties/PartyForm";
import ItemList from "@/pages/items/ItemList";
import ItemForm from "@/pages/items/ItemForm";
import ItemCategoryPage from "@/pages/items/ItemCategoryPage";
import ProductsPage from "@/pages/items/ProductsPage";
import ServiceItemsPage from "@/pages/items/ServiceItemsPage";
import BrandMasterPage from "@/pages/items/BrandMasterPage";
import SalesZonePage from "@/pages/sales/SalesZonePage";
import PriceStructurePage from "@/pages/sales/PriceStructurePage";
import SalesForm from "@/pages/sales/SalesForm";
import SalesEnquiryPage from "@/pages/sales/SalesEnquiryPage";
import SalesQuotationPage from "@/pages/sales/SalesQuotationPage";
import SalesOrderPage from "@/pages/sales/SalesOrderPage";
import DeliveryChallanPage from "@/pages/sales/DeliveryChallanPage";
import PurchaseOrderPage from "@/pages/purchase/PurchaseOrderPage";
import LedgerPage from "@/pages/accounting/LedgerPage";
import PurchaseInvoicePage from "@/pages/purchase/PurchaseInvoicePage";
import DebitNotePage from "@/pages/accounting/DebitNotePage";
import TaxInvoicePage from "@/pages/sales/TaxInvoicePage";
import CreditNotePage from "@/pages/accounting/CreditNotePage";
import GSTExpensePage from "@/pages/accounting/GSTExpensePage";
import GSTIncomePage from "@/pages/accounting/GSTIncomePage";
import GSTPaymentPage from "@/pages/accounting/GSTPaymentPage";
import TCSTDSPaymentPage from "@/pages/accounting/TCSTDSPaymentPage";
import JournalEntryPage from "@/pages/accounting/JournalEntryPage";
import PaymentVoucherPage from "@/pages/accounting/PaymentVoucherPage";
import Receivables from "@/pages/accounting/Receivables";
import Payables from "@/pages/accounting/Payables";
import SalesReport from "@/pages/reports/SalesReport";
import PurchaseReport from "@/pages/reports/PurchaseReport";
import TopCustomers from "@/pages/reports/TopCustomers";
import TopProducts from "@/pages/reports/TopProducts";
import StateWiseSales from "@/pages/reports/StateWiseSales";
import Profile from "@/pages/Profile";
import UserManagement from "@/pages/admin/UserManagement";
import DataExportPage from "@/pages/admin/DataExportPage";
import StoreLocationPage from "@/pages/store/StoreLocationPage";
import GateInwardPage from "@/pages/store/GateInwardPage";
import MarkingPage from "@/pages/store/MarkingPage";
import PackingPage from "@/pages/store/PackingPage";
import OpeningStockPage from "@/pages/store/OpeningStockPage";
import TermsPage from "@/pages/config/TermsPage";
import TransportPage from "@/pages/config/TransportPage";
import HsnMasterPage from "@/pages/config/HsnMasterPage";
import TaxMasterPage from "@/pages/config/TaxMasterPage";
import ExpenseMasterPage from "@/pages/config/ExpenseMasterPage";
import GroupMasterPage from "@/pages/config/GroupMasterPage";
import TaxClassPage from "@/pages/config/TaxClassPage";
import VoucherPrefixPage from "@/pages/config/VoucherPrefixPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/auth" element={<Auth />} />

              {/* Pending Verification - no role required */}
              <Route
                path="/pending"
                element={
                  <ProtectedRoute requireRole={false}>
                    <PendingVerification />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Admin Only Routes */}
                        <Route
                          path="/admin/users"
                          element={
                            <RoleBasedRoute allowedRoles={['superadmin', 'admin']}>
                              <UserManagement />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/admin/export"
                          element={
                            <RoleBasedRoute allowedRoles={['superadmin']}>
                              <DataExportPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <Profile />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Admin, Distributor & Salesperson Routes */}
                        <Route
                          path="/setup"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <DistributorSetup />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/parties"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <PartyList />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/parties/new"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <PartyForm />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/parties/:id"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <PartyForm />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ItemList />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/new"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ItemForm />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/:id"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ItemForm />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/categories"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ItemCategoryPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/products"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ProductsPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/services"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ServiceItemsPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/items/brands"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <BrandMasterPage />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Purchase Order - Admin & Distributor */}
                        <Route
                          path="/purchase-orders"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <PurchaseOrderPage />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Sales - All roles */}
                        <Route
                          path="/sales/zones"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <SalesZonePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/price-structure"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <PriceStructurePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/new"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <SalesForm />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/enquiry"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <SalesEnquiryPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/quotation"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <SalesQuotationPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/order"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <SalesOrderPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/challan"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <DeliveryChallanPage />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Accounting - Admin & Distributor */}
                        <Route
                          path="/accounting/ledger"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <LedgerPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/purchase/invoice"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <PurchaseInvoicePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/debit-note"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <DebitNotePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/sales/tax-invoice"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor', 'salesperson']}>
                              <TaxInvoicePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/credit-note"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <CreditNotePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/gst-expense"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <GSTExpensePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/gst-income"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <GSTIncomePage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/gst-payment"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <GSTPaymentPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/tcs-tds-payment"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TCSTDSPaymentPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/journal-entry"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <JournalEntryPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/payment-voucher"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <PaymentVoucherPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/receivables"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <Receivables />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/accounting/payables"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <Payables />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Reports - Admin & Distributor */}
                        <Route
                          path="/reports/sales"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <SalesReport />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/reports/purchase"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <PurchaseReport />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/reports/customers"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TopCustomers />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/reports/products"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TopProducts />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/reports/states"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <StateWiseSales />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Store - Admin & Distributor */}
                        <Route
                          path="/store/gate-inward"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <GateInwardPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/store/marking"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <MarkingPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/store/packing"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <PackingPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/store/location"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <StoreLocationPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/store/opening-stock"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <OpeningStockPage />
                            </RoleBasedRoute>
                          }
                        />

                        {/* Configuration - Admin & Distributor */}
                        <Route
                          path="/config/terms"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TermsPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/transport"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TransportPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/hsn"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <HsnMasterPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/tax"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TaxMasterPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/expense"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <ExpenseMasterPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/group"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <GroupMasterPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/tax-class"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <TaxClassPage />
                            </RoleBasedRoute>
                          }
                        />
                        <Route
                          path="/config/voucher-prefix"
                          element={
                            <RoleBasedRoute allowedRoles={['admin', 'distributor']}>
                              <VoucherPrefixPage />
                            </RoleBasedRoute>
                          }
                        />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
