import { useState, useMemo } from 'react';
import { Layers, ArrowUpDown, Filter, ChevronUp, ChevronDown, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ProductItem {
    id?: string;
    name: string;
    value: number; // Revenue
    secondary?: number; // Qty
}

interface TopProductsTableProps {
    products: ProductItem[];
}

type SortField = 'name' | 'price' | 'sales' | 'earnings';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'top3' | 'highEarnings' | 'highQty';

export function TopProductsTable({ products }: TopProductsTableProps) {
    const [sortField, setSortField] = useState<SortField>('earnings');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filterOption, setFilterOption] = useState<FilterOption>('all');

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);

    // Calculate price for each product
    const productsWithPrice = useMemo(() => {
        return products.map(p => ({
            ...p,
            price: p.secondary && p.secondary > 0 ? p.value / p.secondary : 0,
        }));
    }, [products]);

    // Sort products
    const sortedProducts = useMemo(() => {
        const sorted = [...productsWithPrice].sort((a, b) => {
            let aVal: number | string = 0;
            let bVal: number | string = 0;

            switch (sortField) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'price':
                    aVal = a.price;
                    bVal = b.price;
                    break;
                case 'sales':
                    aVal = a.secondary || 0;
                    bVal = b.secondary || 0;
                    break;
                case 'earnings':
                    aVal = a.value;
                    bVal = b.value;
                    break;
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return sorted;
    }, [productsWithPrice, sortField, sortDirection]);

    // Filter products
    const filteredProducts = useMemo(() => {
        switch (filterOption) {
            case 'top3':
                return sortedProducts.slice(0, 3);
            case 'highEarnings':
                const avgEarnings = sortedProducts.reduce((sum, p) => sum + p.value, 0) / sortedProducts.length;
                return sortedProducts.filter(p => p.value >= avgEarnings);
            case 'highQty':
                const avgQty = sortedProducts.reduce((sum, p) => sum + (p.secondary || 0), 0) / sortedProducts.length;
                return sortedProducts.filter(p => (p.secondary || 0) >= avgQty);
            default:
                return sortedProducts;
        }
    }, [sortedProducts, filterOption]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="text-[10px] ml-1 opacity-50">↕</span>;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-3 h-3 ml-1 inline text-indigo-500" />
            : <ChevronDown className="w-3 h-3 ml-1 inline text-indigo-500" />;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Top Products</h3>
                    {filterOption !== 'all' && (
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {filterOption === 'top3' ? 'Top 3' : filterOption === 'highEarnings' ? 'High Earnings' : 'High Qty'}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                <ArrowUpDown className="w-3 h-3" /> Sort
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel className="text-xs text-gray-500">Sort By</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleSort('name')}
                                className={sortField === 'name' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Product Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleSort('price')}
                                className={sortField === 'price' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleSort('sales')}
                                className={sortField === 'sales' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Sales (Qty) {sortField === 'sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleSort('earnings')}
                                className={sortField === 'earnings' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Earnings {sortField === 'earnings' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filter Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${filterOption !== 'all'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                                <Filter className="w-3 h-3" /> Filter
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs text-gray-500">Quick Filters</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setFilterOption('all')}
                                className={filterOption === 'all' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Show All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setFilterOption('top3')}
                                className={filterOption === 'top3' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                Top 3 Only
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setFilterOption('highEarnings')}
                                className={filterOption === 'highEarnings' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                High Earnings (&gt; Avg)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setFilterOption('highQty')}
                                className={filterOption === 'highQty' ? 'bg-indigo-50 text-indigo-600' : ''}
                            >
                                High Quantity (&gt; Avg)
                            </DropdownMenuItem>
                            {filterOption !== 'all' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setFilterOption('all')}
                                        className="text-red-600"
                                    >
                                        <X className="w-3 h-3 mr-2" /> Clear Filter
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th
                                className="font-medium py-3 pl-2 cursor-pointer hover:text-gray-600"
                                onClick={() => handleSort('name')}
                            >
                                Product <SortIcon field="name" />
                            </th>
                            <th className="font-medium py-3 text-right">Stocks</th>
                            <th
                                className="font-medium py-3 text-right cursor-pointer hover:text-gray-600"
                                onClick={() => handleSort('price')}
                            >
                                Price <SortIcon field="price" />
                            </th>
                            <th
                                className="font-medium py-3 text-right cursor-pointer hover:text-gray-600"
                                onClick={() => handleSort('sales')}
                            >
                                Sales <SortIcon field="sales" />
                            </th>
                            <th
                                className="font-medium py-3 text-right pr-2 cursor-pointer hover:text-gray-600"
                                onClick={() => handleSort('earnings')}
                            >
                                Earnings <SortIcon field="earnings" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredProducts.length > 0 ? filteredProducts.map((product, index) => {
                            return (
                                <tr key={index} className="group hover:bg-gray-50 transition-colors border-b border-dashed border-gray-50 last:border-0">
                                    <td className="py-4 pl-2 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                                            {product.name.substring(0, 2)}
                                        </div>
                                        <span className="font-medium text-gray-900 truncate max-w-[150px]">{product.name}</span>
                                    </td>
                                    <td className="py-4 text-right text-gray-500">-</td>
                                    <td className="py-4 text-right text-gray-500">{formatCurrency(product.price)}</td>
                                    <td className="py-4 text-right text-gray-500">{product.secondary || 0}</td>
                                    <td className="py-4 pr-2 text-right font-medium text-gray-900">{formatCurrency(product.value)}</td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No top products data</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
