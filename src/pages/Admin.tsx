import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Edit2, Trash2, Sparkles, Download, CheckCircle2, XCircle } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

export function Admin() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryStr, setBulkCategoryStr] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "16:9" | "4:3">("1:1");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    imageUrl: "",
    category: "",
    inStock: true
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        const newRef = doc(collection(db, "products"));
        await setDoc(newRef, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Refresh list
      const snapshot = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      
      setFormData({ name: "", description: "", price: 0, imageUrl: "", category: "", inStock: true });
      setEditingId(null);
    } catch (error) {
      const type = editingId ? OperationType.UPDATE : OperationType.CREATE;
      handleFirestoreError(error, type, editingId ? `products/${editingId}` : "products");
    }
  };

  const handleEdit = (p: Product) => {
    setFormData({
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
      category: p.category,
      inStock: p.inStock
    });
    setEditingId(p.id!);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter(p => p.id !== id));
      
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const generateImageWithAI = async () => {
    if (!formData.name) {
      alert("Please enter a product name first to generate an image.");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `A professional, highly detailed, photorealistic product photo of: ${formData.name}. ${formData.description ? 'Description: ' + formData.description : ''}. Clean background, studio lighting, suitable for an e-commerce store.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: imageAspectRatio
          }
        }
      });

      let base64String = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
           base64String = part.inlineData.data;
           break;
        }
      }

      if (base64String) {
         const dataUrl = `data:image/png;base64,${base64String}`;
         const img = new Image();
         img.onload = () => {
           const canvas = document.createElement("canvas");
           const maxSize = 512;
           let width = img.width;
           let height = img.height;
           if (width > height) {
             if (width > maxSize) {
               height *= maxSize / width;
               width = maxSize;
             }
           } else {
              if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
              }
           }
           canvas.width = width;
           canvas.height = height;
           const ctx = canvas.getContext("2d");
           if (ctx) {
             // Fill background with white in case of transparency
             ctx.fillStyle = "#ffffff";
             ctx.fillRect(0, 0, width, height);
             ctx.drawImage(img, 0, 0, width, height);
             const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
             setFormData({ ...formData, imageUrl: compressedBase64 });
           }
         };
         img.src = dataUrl;
      } else {
        alert("Failed to generate image.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Error generating image. Check console for details.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      const img = new globalThis.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 512;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setFormData({ ...formData, imageUrl: compressedBase64 });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort();
  const filteredProducts = products.filter(p => {
    if (filterStock === 'in' && !p.inStock) return false;
    if (filterStock === 'out' && p.inStock) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProducts.map(p => p.id!)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: 'in-stock' | 'out-of-stock' | 'category') => {
    if (!isAdmin || selectedIds.size === 0) return;
    
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, "products", id);
        if (action === 'in-stock') {
          batch.update(ref, { inStock: true, updatedAt: serverTimestamp() });
        } else if (action === 'out-of-stock') {
          batch.update(ref, { inStock: false, updatedAt: serverTimestamp() });
        } else if (action === 'category' && bulkCategoryStr) {
          batch.update(ref, { category: bulkCategoryStr, updatedAt: serverTimestamp() });
        }
      });
      await batch.commit();

      setProducts(products.map(p => {
        if (selectedIds.has(p.id!)) {
          return {
            ...p,
            ...(action === 'in-stock' ? { inStock: true } : {}),
            ...(action === 'out-of-stock' ? { inStock: false } : {}),
            ...(action === 'category' && bulkCategoryStr ? { category: bulkCategoryStr } : {})
          };
        }
        return p;
      }));
      
      setSelectedIds(new Set());
      setBulkCategoryStr("");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "products");
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "products", id));
      });
      await batch.commit();
      
      setProducts(products.filter(p => !selectedIds.has(p.id!)));
      setSelectedIds(new Set());
    } catch(error) {
      handleFirestoreError(error, OperationType.DELETE, "products");
    }
  };

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return;

    const headers = ['ID', 'Name', 'Description', 'Price', 'Category', 'In Stock', 'Image URL'];
    
    const escapeCSV = (str: string | number | boolean | undefined) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [
      headers.join(','),
      ...filteredProducts.map(p => [
        escapeCSV(p.id),
        escapeCSV(p.name),
        escapeCSV(p.description),
        escapeCSV(p.price),
        escapeCSV(p.category),
        escapeCSV(p.inStock ? 'Yes' : 'No'),
        escapeCSV(p.imageUrl)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "products.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateDemoData = async () => {
    if (!isAdmin || isGeneratingDemo) return;
    setIsGeneratingDemo(true);
    try {
      const demoProducts = [
        {
          name: "عسل دوعني أصلي درجه أولى",
          description: "عسل دوعني حضرمي صافي 100%، ممتاز ومضمون. مفيد للصحة ومناسب للإهداء.",
          price: 35000,
          category: "عسل (Honey)",
          imageUrl: "https://images.unsplash.com/photo-1587049352847-4d4b1fbf43ae?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "بن خولاني يمني",
          description: "أفضل أنواع البن الخولاني المحمص بعناية فائقة. طعم أصيل ورائحة تملأ المكان.",
          price: 18000,
          category: "بن (Coffee)",
          imageUrl: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "زبيب رازقي يمني",
          description: "زبيب طبيعي مجفف في الشمس، منتج بلدي من أجود المزارع اليمنية.",
          price: 8500,
          category: "مكسرات (Nuts & Raisins)",
          imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "لوز بلدي يمني",
          description: "لوز بلدي يمني طازج ومقرمش من أعلى الجبال.",
          price: 12000,
          category: "مكسرات (Nuts & Raisins)",
          imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?q=80&w=600&auto=format&fit=crop",
          inStock: false
        },
        {
          name: "جنبية صيفانية فاخرة",
          description: "جنبية ذات مقبض صيفاني قديم وممتاز، مع حزام مطرز بالذهب (العسيب).",
          price: 650000,
          category: "تراث (Heritage)",
          imageUrl: "https://images.unsplash.com/photo-1590211244463-547e30737aae?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "عطر ليالي الشرق الأصلي",
          description: "عطر نسائي فاخر برائحة العود والمِسك والورد. ثبات عالي ورائحة مميزة.",
          price: 15000,
          category: "عطور (Perfumes)",
          imageUrl: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "طقم إكسسوارت مطلي بالذهب",
          description: "طقم جميل وأنيق مطلي بماء الذهب عيار 21، مكون من قلادة وأقراط وخاتم.",
          price: 25000,
          category: "إكسسوارات (Accessories)",
          imageUrl: "https://images.unsplash.com/photo-1599643478524-fb5244502120?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "مخمرية عرائسي فاخرة",
          description: "مخمرية يمنية أصلية بمكونات العود والزعفران، للعرائس والمناسبات السعيدة.",
          price: 8000,
          category: "عطور (Perfumes)",
          imageUrl: "https://images.unsplash.com/photo-1616654714467-f2832ce26ef6?q=80&w=600&auto=format&fit=crop",
          inStock: true
        },
        {
          name: "حقيبة يد نسائية أنيقة",
          description: "حقيبة يد بتصميم راقي وعملي، مناسبة للدوام والمناسبات. متوفرة بألوان متعددة.",
          price: 18500,
          category: "إكسسوارات (Accessories)",
          imageUrl: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=600&auto=format&fit=crop",
          inStock: false
        }
      ];

      const batch = writeBatch(db);
      demoProducts.forEach(product => {
        const newRef = doc(collection(db, "products"));
        batch.set(newRef, {
          ...product,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();

      const snapshot = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "products");
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied: Admins Only</h2>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input required type="text"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea required rows={3}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (YER)</label>
                <input required type="number" step="1" min="0"
                  value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input required type="text"
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
              </div>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">Upload:</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">AI Ratio:</label>
                    <select 
                      value={imageAspectRatio} 
                      onChange={e => setImageAspectRatio(e.target.value as any)}
                      className="rounded-md border border-gray-300 py-1 pl-2 pr-6 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="1:1">1:1</option>
                      <option value="16:9">16:9</option>
                      <option value="4:3">4:3</option>
                    </select>
                    <button
                      type="button"
                      onClick={generateImageWithAI}
                      disabled={isGeneratingImage}
                      className="flex items-center space-x-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {isGeneratingImage ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-indigo-600 mr-1"></div>
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{isGeneratingImage ? 'Generating...' : 'AI Generate'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <input required type="text"
                placeholder="Image URL or upload/generate above"
                value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
              {formData.imageUrl && (
                <div className="mt-2 aspect-square w-24 overflow-hidden rounded-md border border-gray-200">
                  <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="inStock"
                checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <label htmlFor="inStock" className="ml-2 block text-sm text-gray-900">In Stock</label>
            </div>
            <div className="flex space-x-3 pt-4">
              <button type="submit" className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                {editingId ? 'Update' : 'Add Product'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({ name: "", description: "", price: 0, imageUrl: "", category: "", inStock: true }); }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? (
             <div className="flex h-32 items-center justify-center">
               <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-green-600"></div>
             </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mr-2">Status:</label>
                    <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="rounded-md border border-gray-300 py-1 pl-2 pr-6 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="all">All</option>
                      <option value="in">In Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mr-2">Category:</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-md border border-gray-300 py-1 pl-2 pr-6 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="all">All Categories</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                  </div>
                  {products.length === 0 && (
                    <button 
                      onClick={generateDemoData}
                      disabled={isGeneratingDemo}
                      className="inline-flex items-center space-x-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <span>{isGeneratingDemo ? 'Generating...' : 'Load Demo Data'}</span>
                    </button>
                  )}
                  <button 
                    onClick={handleExportCSV}
                    disabled={filteredProducts.length === 0}
                    className="inline-flex items-center space-x-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-green-50 px-6 py-3">
                  <span className="text-sm font-medium text-green-800">{selectedIds.size} selected</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleBulkAction('in-stock')} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500">In Stock</button>
                    <button onClick={() => handleBulkAction('out-of-stock')} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500">Out of Stock</button>
                    <button onClick={() => {
                        if (window.confirm("Delete selected products?")) handleBulkDelete();
                      }} 
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500">
                      Delete
                    </button>
                    
                    <div className="ml-2 flex items-center space-x-2 border-l border-gray-300 pl-4">
                      <input 
                        type="text" 
                        placeholder="New Category" 
                        value={bulkCategoryStr} 
                        onChange={e => setBulkCategoryStr(e.target.value)} 
                        className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" 
                      />
                      <button 
                        onClick={() => handleBulkAction('category')} 
                        disabled={!bulkCategoryStr.trim()} 
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-green-500">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} 
                        onChange={handleSelectAll} 
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className={selectedIds.has(p.id!) ? "bg-green-50/50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(p.id!)} 
                          onChange={() => handleSelectRow(p.id!)} 
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 shrink-0">
                            <img className="h-10 w-10 rounded-md object-cover" src={p.imageUrl} alt="" referrerPolicy="no-referrer" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{p.name}</div>
                            <div className="text-sm text-gray-500">{p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{p.price.toLocaleString()} YER</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${p.inStock ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                          {p.inStock ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          <span>{p.inStock ? 'In Stock' : 'Out of Stock'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id!)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
