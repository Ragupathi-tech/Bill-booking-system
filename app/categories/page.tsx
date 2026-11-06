'use client';

import React, { useState, useEffect } from 'react';
import { Category, Product } from '@/types/pos';
import { posStore, subscribeToStore } from '@/lib/db/posStore';
import { BackButton } from '@/components/ui/BackButton';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Flame,
  UtensilsCrossed,
  Drumstick,
  Beef,
  Salad,
  Wheat,
  Cookie,
  GlassWater,
  Citrus,
  Coffee,
  IceCream2,
} from 'lucide-react';

const ICON_OPTIONS = [
  { name: 'Flame', label: 'Biryani / Spices' },
  { name: 'UtensilsCrossed', label: 'Parotta / Main Course' },
  { name: 'Drumstick', label: 'Chicken' },
  { name: 'Beef', label: 'Mutton' },
  { name: 'Salad', label: 'Meals / Veg' },
  { name: 'Wheat', label: 'Rice & Grains' },
  { name: 'Layers', label: 'Dosa & Tiffin' },
  { name: 'Cookie', label: 'Snacks' },
  { name: 'GlassWater', label: 'Cool Drinks' },
  { name: 'Citrus', label: 'Fresh Juice' },
  { name: 'Coffee', label: 'Tea & Coffee' },
  { name: 'IceCream2', label: 'Desserts' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    icon: 'UtensilsCrossed',
    active: true,
    sort_order: 1,
  });

  useEffect(() => {
    const load = () => {
      setCategories(posStore.getCategories());
      setProducts(posStore.getProducts());
    };
    load();
    const unsub = subscribeToStore(load);
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: 'Flame',
      active: true,
      sort_order: categories.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      icon: cat.icon || 'UtensilsCrossed',
      active: cat.active,
      sort_order: cat.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (cat: Category) => {
    await posStore.saveCategory({
      ...cat,
      active: !cat.active,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    const dishCount = products.filter((p) => p.category_id === id).length;
    if (dishCount > 0) {
      alert(`Cannot delete "${name}" because it contains ${dishCount} products. Move or delete them first.`);
      return;
    }
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      await posStore.deleteCategory(id);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    if (editingCategory) {
      await posStore.saveCategory({
        ...editingCategory,
        ...formData,
      });
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        ...formData,
      };
      await posStore.saveCategory(newCat);
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
                Menu Structure
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Category Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize food sections for rapid touchscreen POS selection
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Add New Category
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <FolderTree size={20} />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-white">{cat.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        {count} {count === 1 ? 'Dish' : 'Dishes'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    #{cat.sort_order}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cat.active
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cat.active ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    {cat.active ? 'Active' : 'Disabled'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Biryani, Parotta, Drinks"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Display Icon / Theme
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label} ({opt.name})
                      </option>
                    ))}
                  </select>
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
                    <span className="text-slate-300 font-medium">Active on POS</span>
                  </label>
                </div>

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
                    Save Category
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
