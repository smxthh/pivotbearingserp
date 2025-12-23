import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  IndianRupee,
  Receipt,
  BookOpen,
  BarChart3,
  ChevronDown,
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
  PanelLeftClose,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useDistributorProfile } from '@/hooks/useDistributorProfile';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon?: React.ElementType; allowedRoles?: AppRole[] }[];
  allowedRoles?: AppRole[];
}

interface MenuGroup {
  label: string;
  items: NavItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'MAIN',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        allowedRoles: ['admin', 'distributor', 'salesperson']
      },
      {
        title: 'Party Master',
        href: '/parties',
        icon: Users,
        allowedRoles: ['admin', 'distributor']
      },
      {
        title: 'Item Master',
        icon: Package,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Item Category', href: '/items/categories', icon: Layers, allowedRoles: ['admin', 'distributor'] },
          { title: 'Products', href: '/items/products', icon: Boxes, allowedRoles: ['admin', 'distributor'] },
          { title: 'Service Items', href: '/items/services', icon: Tags, allowedRoles: ['admin', 'distributor'] },
          { title: 'Brand Master', href: '/items/brands', icon: Award, allowedRoles: ['admin', 'distributor'] },
        ],
      },
      {
        title: 'Purchase',
        icon: ShoppingCart,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Purchase Order', href: '/purchase-orders', icon: ClipboardList, allowedRoles: ['admin', 'distributor'] },
          { title: 'Purchase Invoice', href: '/purchase/invoice', icon: Receipt, allowedRoles: ['admin', 'distributor'] },
        ],
      },
      {
        title: 'Sales',
        icon: IndianRupee,
        allowedRoles: ['admin', 'distributor', 'salesperson'],
        children: [
          { title: 'Sales Enquiry', href: '/sales/enquiry', icon: FileText, allowedRoles: ['admin', 'distributor', 'salesperson'] },
          { title: 'Sales Quotation', href: '/sales/quotation', icon: FilePlus, allowedRoles: ['admin', 'distributor', 'salesperson'] },
          { title: 'Sales Order', href: '/sales/order', icon: ClipboardList, allowedRoles: ['admin', 'distributor', 'salesperson'] },
          { title: 'Delivery Challan', href: '/sales/challan', icon: Truck, allowedRoles: ['admin', 'distributor', 'salesperson'] },
          { title: 'Tax Invoice', href: '/sales/tax-invoice', icon: FileCheck, allowedRoles: ['admin', 'distributor', 'salesperson'] },
          { title: 'Price Structure', href: '/sales/price-structure', icon: Tags, allowedRoles: ['admin', 'distributor'] },
          { title: 'Sales Zone', href: '/sales/zones', icon: MapPin, allowedRoles: ['admin', 'distributor'] },
        ],
      },
      {
        title: 'Store',
        icon: Warehouse,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Store Location', href: '/store/location', icon: MapPin, allowedRoles: ['admin', 'distributor'] },
          { title: 'Gate Inward', href: '/store/gate-inward', icon: PackageCheck, allowedRoles: ['admin', 'distributor'] },
          { title: 'Marking', href: '/store/marking', icon: Stamp, allowedRoles: ['admin', 'distributor'] },
          { title: 'Packing', href: '/store/packing', icon: PackageOpen, allowedRoles: ['admin', 'distributor'] },
          { title: 'Opening Stock', href: '/store/opening-stock', icon: Archive, allowedRoles: ['admin', 'distributor'] },
        ],
      },
    ]
  },
  {
    label: 'FEATURES',
    items: [
      {
        title: 'Accounting',
        icon: BookOpen,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Ledger', href: '/accounting/ledger', icon: BookOpen, allowedRoles: ['admin', 'distributor'] },
          { title: 'Debit Note', href: '/accounting/debit-note', icon: ArrowUpCircle, allowedRoles: ['admin', 'distributor'] },

          { title: 'Credit Note', href: '/accounting/credit-note', icon: ArrowDownCircle, allowedRoles: ['admin', 'distributor'] },
          { title: 'GST Expense', href: '/accounting/gst-expense', icon: Calculator, allowedRoles: ['admin', 'distributor'] },
          { title: 'GST Income', href: '/accounting/gst-income', icon: CreditCard, allowedRoles: ['admin', 'distributor'] },
          { title: 'GST Payment', href: '/accounting/gst-payment', icon: Wallet, allowedRoles: ['admin', 'distributor'] },
          { title: 'TCS/TDS Payment', href: '/accounting/tcs-tds-payment', icon: HandCoins, allowedRoles: ['admin', 'distributor'] },
          { title: 'Journal Entry', href: '/accounting/journal-entry', icon: PenLine, allowedRoles: ['admin', 'distributor'] },
          { title: 'Payment Voucher', href: '/accounting/payment-voucher', icon: FileText, allowedRoles: ['admin', 'distributor'] },
          { title: 'Receivables', href: '/accounting/receivables', icon: ArrowDownCircle, allowedRoles: ['admin', 'distributor'] },
          { title: 'Payables', href: '/accounting/payables', icon: ArrowUpCircle, allowedRoles: ['admin', 'distributor'] },
        ],
      },
      {
        title: 'Reports',
        icon: BarChart3,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Sales Report', href: '/reports/sales', icon: TrendingUp, allowedRoles: ['admin', 'distributor'] },
          { title: 'Purchase Report', href: '/reports/purchase', icon: ShoppingCart, allowedRoles: ['admin', 'distributor'] },
          { title: 'Top Customers', href: '/reports/customers', icon: Users, allowedRoles: ['admin', 'distributor'] },
          { title: 'Top Products', href: '/reports/products', icon: PieChart, allowedRoles: ['admin', 'distributor'] },
          { title: 'State-wise Sales', href: '/reports/states', icon: MapPin, allowedRoles: ['admin', 'distributor'] },
        ],
      },
    ]
  },
  {
    label: 'CONFIGURATION',
    items: [
      {
        title: 'Configuration',
        icon: Settings,
        allowedRoles: ['admin', 'distributor'],
        children: [
          { title: 'Terms', href: '/config/terms', icon: FileText, allowedRoles: ['admin', 'distributor'] },
          { title: 'Transport', href: '/config/transport', icon: Truck, allowedRoles: ['admin', 'distributor'] },
          { title: 'HSN Master', href: '/config/hsn', icon: Hash, allowedRoles: ['admin', 'distributor'] },
          { title: 'Tax Master', href: '/config/tax', icon: Percent, allowedRoles: ['admin', 'distributor'] },
          { title: 'Expense Master', href: '/config/expense', icon: Receipt, allowedRoles: ['admin', 'distributor'] },
          { title: 'Group Master', href: '/config/group', icon: Folder, allowedRoles: ['admin', 'distributor'] },
          { title: 'Tax Class', href: '/config/tax-class', icon: ListTree, allowedRoles: ['admin', 'distributor'] },
          { title: 'Voucher Prefix', href: '/config/voucher-prefix', icon: BookMarked, allowedRoles: ['admin', 'distributor'] },
        ],
      },
    ]
  },
  {
    label: 'TOOLS',
    items: [
      {
        title: 'User Management',
        href: '/admin/users',
        icon: ShieldCheck,
        allowedRoles: ['admin']
      },
      {
        title: 'My Profile',
        href: '/profile',
        icon: Settings,
        allowedRoles: ['admin', 'distributor', 'salesperson']
      },
    ]
  }
];

// Menu Section Component
function MenuSection({
  label,
  items,
  expandedGroups,
  toggleGroup,
  isActive,
  canAccess,
  isGroupActive
}: {
  label: string;
  items: NavItem[];
  expandedGroups: string[];
  toggleGroup: (title: string) => void;
  isActive: (href: string) => boolean;
  canAccess: (allowedRoles?: AppRole[]) => boolean;
  isGroupActive: (item: NavItem) => boolean;
}) {
  const filteredItems = items.filter(item => canAccess(item.allowedRoles));

  if (filteredItems.length === 0) return null;

  return (
    <div className="mb-5">
      {/* Section Label */}
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
          {label}
        </span>
      </div>

      {/* Menu Items with Tree Lines */}
      <div className="relative">
        {filteredItems.map((item, index) => (
          <MenuItem
            key={item.title}
            item={item}
            isLast={index === filteredItems.length - 1}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            isActive={isActive}
            canAccess={canAccess}
            isGroupActive={isGroupActive}
          />
        ))}
      </div>
    </div>
  );
}

// Menu Item Component
function MenuItem({
  item,
  isLast,
  expandedGroups,
  toggleGroup,
  isActive,
  canAccess,
  isGroupActive
}: {
  item: NavItem;
  isLast: boolean;
  expandedGroups: string[];
  toggleGroup: (title: string) => void;
  isActive: (href: string) => boolean;
  canAccess: (allowedRoles?: AppRole[]) => boolean;
  isGroupActive: (item: NavItem) => boolean;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedGroups.includes(item.title);
  const active = item.href ? isActive(item.href) : isGroupActive(item);

  return (
    <div className="relative">
      {/* Tree connector line */}
      <div className="absolute left-[18px] top-0 bottom-0 flex flex-col items-center pointer-events-none">
        <div className={cn(
          "w-px bg-slate-300",
          isLast && !hasChildren ? "h-[50%]" : "h-full"
        )} />
      </div>

      {/* Horizontal connector */}
      <div className="absolute left-[18px] top-[50%] w-3 h-px bg-slate-300 pointer-events-none"
        style={{ transform: 'translateY(-50%)' }} />

      {/* Menu item content */}
      <div className="relative pl-8">
        {item.href ? (
          <NavLink
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative overflow-hidden group',
              active
                ? 'text-primary'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {/* Active state - soft blue glassmorphism */}
            {active && (
              <div className="absolute inset-0 bg-primary/5 border border-primary/10 rounded-xl shadow-sm" />
            )}

            {/* Hover effect */}
            {!active && (
              <div className="absolute inset-0 bg-transparent group-hover:bg-slate-100 rounded-xl transition-all duration-200" />
            )}

            <item.icon className={cn(
              "h-[18px] w-[18px] flex-shrink-0 relative z-10 transition-colors duration-200",
              active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
            )} strokeWidth={1.5} />
            <span className="relative z-10 font-medium">{item.title}</span>
          </NavLink>
        ) : (
          <div>
            <button
              onClick={() => toggleGroup(item.title)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group',
                active
                  ? 'text-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200",
                  active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                )} strokeWidth={1.5} />
                <span>{item.title}</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform duration-200',
                  isExpanded ? 'rotate-180' : ''
                )}
                strokeWidth={1.5}
              />
            </button>

            {/* Children */}
            {isExpanded && item.children && (
              <div className="mt-1 ml-3 relative">
                {/* Vertical line for children */}
                <div className="absolute left-[6px] top-0 bottom-2 w-px bg-slate-200" />

                {item.children
                  .filter(child => canAccess(child.allowedRoles))
                  .map((child, childIndex, filteredChildren) => {
                    const ChildIcon = child.icon || FileText;
                    const isChildActive = isActive(child.href);
                    const isChildLast = childIndex === filteredChildren.length - 1;

                    return (
                      <div key={child.href} className="relative">
                        {/* Child horizontal connector */}
                        <div className="absolute left-[6px] top-[50%] w-2 h-px bg-slate-300"
                          style={{ transform: 'translateY(-50%)' }} />
                        {!isChildLast && (
                          <div className="absolute left-[6px] top-[50%] bottom-0 w-px bg-slate-300" />
                        )}

                        <NavLink
                          to={child.href}
                          className={cn(
                            'flex items-center gap-2.5 ml-4 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 relative overflow-hidden group',
                            isChildActive
                              ? 'text-primary font-semibold'
                              : 'text-slate-500 hover:text-slate-800'
                          )}
                        >
                          {/* Active state for children */}
                          {isChildActive && (
                            <div className="absolute inset-0 bg-primary/5 border border-primary/10 rounded-lg" />
                          )}

                          {!isChildActive && (
                            <div className="absolute inset-0 bg-transparent group-hover:bg-slate-50 rounded-lg transition-all duration-200" />
                          )}

                          <ChildIcon className={cn(
                            "h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-200",
                            isChildActive ? "text-primary" : "text-slate-400 group-hover:text-slate-500"
                          )} strokeWidth={1.5} />
                          <span className="relative z-10">{child.title}</span>
                        </NavLink>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useApp();
  const { role } = useAuth();
  const { profile } = useDistributorProfile();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title)
        ? prev.filter((g) => g !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isGroupActive = (item: NavItem) =>
    item.children?.some((child) => location.pathname === child.href) || false;

  const canAccess = (allowedRoles?: AppRole[]) => {
    if (!allowedRoles) return true;
    if (!role) return false;
    // Superadmin has access to everything
    if (role === 'superadmin') return true;
    return allowedRoles.includes(role);
  };

  if (sidebarCollapsed) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-[12px] left-4 z-50 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all duration-200 shadow-md group border-b-2"
        title="Expand Sidebar"
      >
        <PanelLeftClose className="w-5 h-5 rotate-180 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside className="fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col">
        <div className="m-2 flex-1 bg-gray-50 border border-slate-300 rounded-r-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Header with Company Name */}
          <div className="h-16 px-4 flex items-center justify-between gap-3 bg-gray-50 border-b border-slate-200/50">
            {/* Company Name - truncates if too long */}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-700 truncate tracking-tight">
                {profile?.company_name || 'Pivot ERP'}
              </h2>
            </div>

            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all duration-200 shadow-sm group border-b-2"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {menuGroups.map((group) => (
              <MenuSection
                key={group.label}
                label={group.label}
                items={group.items}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                isActive={isActive}
                canAccess={canAccess}
                isGroupActive={isGroupActive}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200 bg-gray-50">
            <p className="text-[10px] text-slate-400 font-medium text-center">
              v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
