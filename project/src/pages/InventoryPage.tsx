import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  ArrowUpDown,
  Boxes,
  Layers,
  MapPin,
  Clock,
  Truck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchInventoryApi,
  restockInventoryApi,
  consumeInventoryApi,
  createInventoryItemApi,
  type InventoryItem,
  type InventorySummary
} from '@/utils/api';

export function InventoryPage() {
  const { session, user } = useAuth();
  const isAdmin = session?.role === 'admin';
  const supervisorStation = session?.stationId;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalSKUs: 0,
    totalValuationInr: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    healthyStockCount: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>(
    isAdmin ? 'ALL' : (supervisorStation || 'A')
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restockNote, setRestockNote] = useState('');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Bearings');
  const [newItemStation, setNewItemStation] = useState(supervisorStation || 'A');
  const [newItemStock, setNewItemStock] = useState(10);
  const [newItemMin, setNewItemMin] = useState(5);
  const [newItemCost, setNewItemCost] = useState(1500);
  const [newItemBin, setNewItemBin] = useState('');
  const [newItemLead, setNewItemLead] = useState(2);
  const [newItemSupplier, setNewItemSupplier] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchInventoryApi({
        station: isAdmin ? (selectedStation === 'ALL' ? undefined : selectedStation) : supervisorStation,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchTerm.trim() || undefined,
      });
      setItems(res.items);
      setSummary(res.summary);
    } catch (e: any) {
      console.error(e);
      showToast('Error loading inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStation, selectedCategory, selectedStatus]);

  // Handle Search debounce / enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Restock Action
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem || restockQty <= 0) return;
    try {
      setSubmittingRestock(true);
      const res = await restockInventoryApi(restockModalItem.id, restockQty, restockNote);
      showToast(`Successfully restocked +${restockQty} units of ${restockModalItem.name}!`);
      setRestockModalItem(null);
      setRestockQty(5);
      setRestockNote('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to restock item');
    } finally {
      setSubmittingRestock(false);
    }
  };

  // Add Item Action
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      setSubmittingAdd(true);
      await createInventoryItemApi({
        name: newItemName.trim(),
        category: newItemCategory,
        station_id: isAdmin ? newItemStation : (supervisorStation || 'A'),
        stock_level: Number(newItemStock),
        min_threshold: Number(newItemMin),
        unit_cost_inr: Number(newItemCost),
        location_bin: newItemBin.trim() || 'Central Bay',
        lead_time_days: Number(newItemLead),
        supplier: newItemSupplier.trim() || 'FactoryIQ Supplies',
      });
      showToast(`Created new spare part: ${newItemName.trim()}`);
      setShowAddModal(false);
      setNewItemName('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create item');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const categories = [
    'ALL',
    'Bearings',
    'Hydraulic Seals',
    'Tooling & Chucks',
    'Electrical & Sensors',
    'Lubricants & Coolants',
    'Mechanical Drives',
    'Robotics & Actuators',
    'Pneumatics',
    'General Hardware',
    'Consumables'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-slide-up">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              {isAdmin ? 'Plant-Wide Central Stores' : `Station ${supervisorStation} Spare Parts`}
            </span>
            <span className="text-xs text-slate-400">• Real-Time Stock Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {isAdmin ? 'Industrial Inventory & Spare Parts Store' : `Station ${supervisorStation} Inventory & Tooling`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Comprehensive spare parts registry across all 4 production lines. Automated low-stock triggers & restock dispatch.'
              : `Designated maintenance components for Station ${supervisorStation}'s machinery fleet with 1-click restock & requisition.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Spare Part</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Stock Value</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₹{(summary.totalValuationInr / 100000).toFixed(2)}L
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">₹{summary.totalValuationInr.toLocaleString('en-IN')} on hand</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Active SKUs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Part SKUs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalSKUs}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.healthyStockCount} at optimal levels</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock Triggers</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{summary.lowStockCount}</p>
            <p className="text-[10px] text-amber-700/80 mt-0.5">Below safety threshold</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical Stockout</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{summary.outOfStockCount}</p>
            <p className="text-[10px] text-rose-600/80 mt-0.5">Immediate reorder required</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Filter & Search Control Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by part name, SKU, or bin location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-slate-400"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Station Selector (Admin Only) */}
          {isAdmin && (
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="ALL">All Stations (Plant-Wide)</option>
              <option value="A">Station A (Machining)</option>
              <option value="B">Station B (Pressing)</option>
              <option value="C">Station C (Assembly)</option>
              <option value="D">Station D (Finishing)</option>
            </select>
          )}

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="in_stock">In Stock (Healthy)</option>
            <option value="low_stock">Low Stock (Warning)</option>
            <option value="out_of_stock">Out of Stock (Critical)</option>
          </select>
        </div>
      </div>

      {/* ── Spare Parts Inventory Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Part / SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Station Scope</th>
                <th className="py-3 px-3">Stock Level &amp; Threshold</th>
                <th className="py-3 px-3">Unit Cost (₹)</th>
                <th className="py-3 px-3">Location / Bin</th>
                <th className="py-3 px-3">Lead Time &amp; Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Loading inventory records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No spare parts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const pct = Math.min(100, Math.round((item.stockLevel / (item.minThreshold * 2 || 10)) * 100));
                  const isLow = item.status === 'low_stock';
                  const isOut = item.status === 'out_of_stock';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Part Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{item.id}</span>
                          {item.compatibleMachines && item.compatibleMachines.length > 0 && (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-sans font-medium">
                              {item.compatibleMachines.length} machines ({item.compatibleMachines.slice(0, 3).join(', ')}{item.compatibleMachines.length > 3 ? '...' : ''})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-semibold">
                          {item.category}
                        </span>
                      </td>

                      {/* Station Scope */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.stationId === 'ALL'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {item.stationId === 'ALL' ? 'Central Store' : `Station ${item.stationId}`}
                        </span>
                      </td>

                      {/* Stock Level & Progress Bar */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.stockLevel} units
                          </span>
                          <span className="text-[10px] text-slate-400">Min: {item.minThreshold}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">₹{item.unitCostInr.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400">Val: ₹{item.totalValuation.toLocaleString('en-IN')}</div>
                      </td>

                      {/* Location Bin */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.locationBin}</span>
                        </div>
                      </td>

                      {/* Lead Time & Supplier */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.leadTimeDays}d lead</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.supplier}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setRestockModalItem(item);
                            setRestockQty(5);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Restock Modal ── */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Restock Component</h3>
                  <p className="text-[10px] text-slate-500">{restockModalItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Component Name</label>
                <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {restockModalItem.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Stock</label>
                  <p className="text-sm font-black text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {restockModalItem.stockLevel} units
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity to Add</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    required
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Add:</span>
                {[5, 10, 25, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setRestockQty(qty)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 text-[10px] font-bold text-slate-700 transition-colors"
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shipment Reference / Note</label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="e.g. PO #8892 from OEM supplier"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submittingRestock ? 'Processing...' : `Receive +${restockQty} Units`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Spare Part Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Spare Part</h3>
                  <p className="text-[10px] text-slate-500">Register SKU in central warehouse database</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Part Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. SKF 6205 Deep Groove Ball Bearing"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Station Scope</label>
                  {isAdmin ? (
                    <select
                      value={newItemStation}
                      onChange={(e) => setNewItemStation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="ALL">Central Store (ALL)</option>
                      <option value="A">Station A (Machining)</option>
                      <option value="B">Station B (Pressing)</option>
                      <option value="C">Station C (Assembly)</option>
                      <option value="D">Station D (Finishing)</option>
                    </select>
                  ) : (
                    <p className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      Station {supervisorStation}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Safety Min</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemMin}
                    onChange={(e) => setNewItemMin(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bin / Shelf Location</label>
                  <input
                    type="text"
                    value={newItemBin}
                    onChange={(e) => setNewItemBin(e.target.value)}
                    placeholder="e.g. Rack A-04, Bin 12"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemLead}
                    onChange={(e) => setNewItemLead(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Supplier</label>
                <input
                  type="text"
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  placeholder="e.g. SKF Bearings India Ltd."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submittingAdd ? 'Saving...' : 'Register Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}