import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Image, Tag, X, Camera } from "lucide-react";
import { WardrobeItem } from "@/data/products";

const UploadPage = () => {
  const [uploads, setUploads] = useState<(WardrobeItem & { tags: string[] })[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const newItem = {
        id: `u${Date.now()}-${Math.random()}`,
        image: url,
        name: file.name.replace(/\.[^.]+$/, ""),
        category: "topwear" as const,
        color: "#888",
        dateAdded: new Date().toISOString().split("T")[0],
        tags: [],
      };
      setUploads((prev) => [newItem, ...prev]);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const updateCategory = (id: string, category: WardrobeItem["category"]) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, category } : u)));
  };

  const addTag = (id: string, tag: string) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, tags: [...u.tags, tag] } : u)));
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Upload Clothes</h1>
        <p className="text-muted-foreground mt-1">Add photos of your clothing items to build your digital wardrobe</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Want a virtual try-on? <Link to="/tryon" className="font-medium text-primary hover:underline">Go to Try On</Link> and preview your uploaded pieces on a model image.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Drag & drop your clothing images</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
          </div>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity">
            <Camera className="w-4 h-4" />
            Choose Files
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        </div>
      </div>

      {/* Uploaded items */}
      {uploads.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Image className="w-5 h-5" /> Uploaded Items ({uploads.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-product"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeUpload(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    value={item.name}
                    onChange={(e) => setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, name: e.target.value } : u)))}
                    className="w-full text-sm font-medium bg-transparent border-b border-border focus:border-primary outline-none pb-1 text-foreground"
                    placeholder="Item name"
                  />
                  {/* Category selector */}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Category</label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {(["topwear", "bottomwear", "footwear", "accessories", "ethnic"] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => updateCategory(item.id, cat)}
                          className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                            item.category === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-primary/10"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Tags */}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Tags
                    </label>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">{tag}</span>
                      ))}
                      <button
                        onClick={() => {
                          const tag = prompt("Enter a tag (e.g. casual, cotton, striped)");
                          if (tag) addTag(item.id, tag);
                        }}
                        className="px-2 py-0.5 rounded border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
