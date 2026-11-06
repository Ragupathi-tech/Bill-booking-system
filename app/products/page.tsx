'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { formatCurrency } from '@/lib/calculations/billCalculator';
import { BackButton } from '@/components/ui/BackButton';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Image as ImageIcon,
  Utensils,
  DollarSign,
  Layers,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: 0,
    gst_percent: 5,
    image_url: '',
    description: '',
    active: true,
    sort_order: 1,
  });

  useEffect(() => {
    const load = () => {
      setProducts(posStore.getProducts());
      setCategories(posStore.getCategories());
    };
    load();
    const unsub = subscribeToStore(load);
    return () => unsub();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === 'ALL' || p.category_id === selectedCat;
      const matchSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || 'cat-biryani',
      price: 100,
      gst_percent: 5,
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600',
      description: '',
      active: true,
      sort_order: products.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category_id: prod.category_id,
      price: prod.price,
      gst_percent: prod.gst_percent,
      image_url: prod.image_url,
      description: prod.description || '',
      active: prod.active,
      sort_order: prod.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string) => {
    await posStore.toggleProductAvailability(id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await posStore.deleteProduct(id);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Product name is required');
      return;
    }
    if (formData.price < 0) {
      alert('Price must be greater than or equal to 0');
      return;
    }

    if (editingProduct) {
      await posStore.saveProduct({
        ...editingProduct,
        ...formData,
      });
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...formData,
      };
      await posStore.saveProduct(newProduct);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <BackButton label="Back to POS" fallbackUrl="/" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Inventory & Menu
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Product Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Add, update prices, change availability, and organize dishes
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Add New Product
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product by name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCat === 'ALL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedCat === cat.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Dish</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">GST</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100'}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">
                              {p.name}
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                          {cat?.name || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(p.price)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {p.gst_percent}%
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(p.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            p.active
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.active ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {p.active ? 'Available' : 'Unavailable'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  {editingProduct ? 'Edit Dish' : 'Add New Dish'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-4 space-y-3.5 text-xs">
                {/* Product Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Chicken Biryani"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Category & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({ ...formData, category_id: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* GST % & Sort Order */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      GST Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={formData.gst_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gst_percent: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sort_order: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Image URL & Live Preview */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, image_url: e.target.value })
                      }
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-[11px]"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100'}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Short description of the preparation or ingredients..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">Available for Order</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
                  >
                    Save Dish
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
