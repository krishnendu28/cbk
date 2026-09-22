import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageOff, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  createBridgeMenuItem,
  deleteBridgeMenuItem,
  fetchBridgeMenuGroups,
  getBridgeMenuGroups,
  resetBridgeMenu,
  subscribeBridgeMenu,
  updateBridgeMenuItem,
  uploadMenuItemImage,
} from "@/lib/bridge";
import { getMenuItemImageUrl } from "@/lib/menu-item-images";

type MenuItemView = {
  id: number;
  name: string;
  price: number;
  prices?: Record<string, number>;
  portions?: Record<string, string>;
  description?: string;
  image: string;
  available: boolean;
};

type VariantRow = { variant: string; price: string; portion: string };

function SafeImage({ src, alt, fallback, className }: { src: string; alt: string; fallback: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const current = failed ? fallback : src || fallback;

  return (
    <div className={className}>
      {current ? (
        <img src={current} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

function VariantRowsEditor({
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rows: VariantRow[];
  onUpdate: (index: number, patch: Partial<VariantRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Size / Variant &amp; Price</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Add variant
        </button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1.3fr_0.9fr_1.1fr_auto] gap-2">
          <Input
            placeholder="e.g. Half"
            value={row.variant}
            onChange={(event) => onUpdate(index, { variant: event.target.value })}
          />
          <Input
            placeholder="Price"
            type="number"
            min="0"
            value={row.price}
            onChange={(event) => onUpdate(index, { price: event.target.value })}
          />
          <Input
            placeholder="Portion (e.g. 4 pcs)"
            value={row.portion}
            onChange={(event) => onUpdate(index, { portion: event.target.value })}
          />
          <button
            type="button"
            disabled={rows.length <= 1}
            onClick={() => onRemove(index)}
            aria-label={`Remove ${row.variant || "variant"} row`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Portion size is shown next to each option (for example: Half 4 pcs · Full 8 pcs).
      </p>
    </div>
  );
}

function ImageUploadField({
  image,
  onImageChange,
  isUploading,
  onUploadFile,
}: {
  image: string;
  onImageChange: (value: string) => void;
  isUploading: boolean;
  onUploadFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input placeholder="Image URL (optional)" value={image} onChange={(event) => onImageChange(event.target.value)} className="sm:flex-1" />
      <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
        <Upload className="h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload picture"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onUploadFile} disabled={isUploading} />
      </label>
    </div>
  );
}

export default function MenuManagement() {
  const [menuGroups, setMenuGroups] = useState(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "non-veg-chakhna");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [variantRows, setVariantRows] = useState<VariantRow[]>([{ variant: "Regular", price: "", portion: "" }]);
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [categoryTitle, setCategoryTitle] = useState(menuGroups[0]?.title || "");
  const [available, setAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

  const fallbackFor = useMemo(() => {
    const cache: Record<string, string> = {};
    return (groupTitle: string, itemName: string) => {
      const key = `${groupTitle}|${itemName}`;
      if (!cache[key]) {
        cache[key] = getMenuItemImageUrl(itemName, groupTitle, "");
      }
      return cache[key];
    };
  }, []);

  async function reloadMenu() {
    const refreshed = await fetchBridgeMenuGroups();
    setMenuGroups(refreshed);
    if (!refreshed.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(refreshed[0]?.id || "");
    }
  }

  useEffect(() => {
    reloadMenu();
    return subscribeBridgeMenu(() => {
      reloadMenu();
    });
  }, []);

  useEffect(() => {
    if (activeGroup?.title) {
      setCategoryTitle(activeGroup.title);
    }
  }, [activeGroup?.id]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeGroup?.items || [];
    return (activeGroup?.items || []).filter((item) => item.name.toLowerCase().includes(query));
  }, [activeGroup?.items, searchQuery]);

  function startEdit(item: MenuItemView) {
    if (!activeGroup) return;
    const priceEntries: [string, number][] =
      item.prices && Object.keys(item.prices).length > 0 ? Object.entries(item.prices) : [["Regular", item.price]];
    setEditingId(item.id);
    setName(item.name);
    setVariantRows(
      priceEntries.map(([variant, value]) => ({
        variant,
        price: String(value),
        portion: item.portions?.[variant] || "",
      })),
    );
    setImage(item.image || "");
    setDescription(item.description || "");
    setCategoryTitle(activeGroup.title);
    setAvailable(item.available !== false);
  }

  function startCreate() {
    setEditingId("new");
    setName("");
    setVariantRows([{ variant: "Regular", price: "", portion: "" }]);
    setImage("");
    setDescription("");
    setCategoryTitle(activeGroup?.title || "");
    setAvailable(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setVariantRows([{ variant: "Regular", price: "", portion: "" }]);
    setImage("");
    setDescription("");
    setCategoryTitle(activeGroup?.title || "");
    setAvailable(true);
  }

  function updateVariantRow(index: number, patch: Partial<VariantRow>) {
    setVariantRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addVariantRow() {
    setVariantRows((prev) => [...prev, { variant: "", price: "", portion: "" }]);
  }

  function removeVariantRow(index: number) {
    setVariantRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  async function handleUploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadMenuItemImage(file);
      setImage(url);
      toast({ title: "Picture uploaded", description: "Save the item to keep this picture." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again or paste an image URL.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function saveEditor() {
    if (!name.trim() || !categoryTitle.trim()) return;

    const pricesMap: Record<string, number> = {};
    const portionsMap: Record<string, string> = {};
    for (const row of variantRows) {
      const variant = row.variant.trim();
      if (!variant) continue;
      const numericPrice = Number(row.price);
      if (Number.isFinite(numericPrice) && numericPrice >= 0) {
        pricesMap[variant] = numericPrice;
      }
      if (row.portion.trim()) {
        portionsMap[variant] = row.portion.trim();
      }
    }

    if (Object.keys(pricesMap).length === 0) {
      toast({ title: "Add at least one price", description: "Enter a price for each variant.", variant: "destructive" });
      return;
    }

    const payload = {
      name: name.trim(),
      price: pricesMap[Object.keys(pricesMap)[0]] ?? Math.min(...Object.values(pricesMap)),
      prices: pricesMap,
      portions: portionsMap,
      description: description.trim() ? description.trim() : undefined,
      image: image.trim() || undefined,
      categoryTitle: categoryTitle.trim(),
      available,
    };

    try {
      setIsSaving(true);
      if (editingId === "new") {
        await createBridgeMenuItem({
          categoryId: undefined,
          ...payload,
        });
        toast({ title: "Menu item created" });
      } else if (typeof editingId === "number") {
        await updateBridgeMenuItem(editingId, {
          ...payload,
          categoryId: activeGroup?.title === categoryTitle.trim() ? activeGroup?.id : undefined,
        });
        toast({ title: "Menu item updated" });
      }

      await reloadMenu();
      cancelEdit();
    } catch (error) {
      toast({
        title: editingId === "new" ? "Failed to add item" : "Failed to update item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(itemId: number, itemName: string) {
    const ok = window.confirm(`Delete menu item "${itemName}" from admin menu?`);
    if (!ok) return;

    try {
      setIsDeletingId(itemId);
      await deleteBridgeMenuItem(itemId);
      await reloadMenu();
      toast({ title: "Menu item deleted" });
      if (editingId === itemId) {
        cancelEdit();
      }
    } catch (error) {
      toast({
        title: "Failed to delete item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  async function handleResetMenu() {
    const ok = window.confirm(
      "Reset the entire menu to the latest default menu? This replaces all current menu items (your manual edits will be lost).",
    );
    if (!ok) return;

    try {
      setIsResetting(true);
      const result = await resetBridgeMenu();
      await reloadMenu();
      toast({ title: "Menu reset to defaults", description: `${result.categories} categories · ${result.items} items` });
      cancelEdit();
    } catch (error) {
      toast({
        title: "Failed to reset menu",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Tap any item to edit it right in place. Changes appear on the live menu instantly.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleResetMenu} disabled={isResetting}>
          {isResetting ? "Resetting..." : "Reset to defaults"}
        </Button>
      </div>

      <Card className="p-3 border-blue-200 bg-blue-50/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items in this category..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={startCreate} disabled={isSaving}>
            <Plus className="h-4 w-4 mr-2" /> Add item
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {menuGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={async () => {
              setActiveGroupId(group.id);
              setSearchQuery("");
            }}
            className={
              activeGroupId === group.id
                ? "px-4 py-2 rounded-full bg-primary text-primary-foreground"
                : "px-4 py-2 rounded-full bg-muted text-foreground"
            }
          >
            {group.title} ({group.items.length})
          </button>
        ))}
      </div>

      {editingId === "new" && (
        <Card className="p-4 space-y-3 border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Add new item to “{categoryTitle}”</h2>
            <Button type="button" variant="ghost" size="icon" onClick={cancelEdit} disabled={isSaving}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Food Name" value={name} onChange={(event) => setName(event.target.value)} />
            <div className="col-span-full">
              <VariantRowsEditor rows={variantRows} onUpdate={updateVariantRow} onAdd={addVariantRow} onRemove={removeVariantRow} />
            </div>
            <Textarea
              placeholder="Short description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="col-span-full"
            />
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Category (e.g. Combos)" value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} />
              <ImageUploadField image={image} onImageChange={setImage} isUploading={isUploadingImage} onUploadFile={handleUploadImage} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
            <div>
              <p className="text-sm font-medium">Availability</p>
              <p className="text-xs text-muted-foreground">Unavailable items stay visible but cannot be ordered.</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={saveEditor} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save item"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const inEdit = editingId === item.id;
          return (
            <Card key={item.id} className="overflow-hidden">
              {inEdit ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-emerald-700">Editing: {item.name}</h3>
                    <Button type="button" variant="ghost" size="icon" onClick={cancelEdit} disabled={isSaving}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <SafeImage
                    src={image}
                    alt="Preview"
                    fallback={fallbackFor(categoryTitle, name || item.name)}
                    className="h-32 w-full overflow-hidden rounded-lg border border-border"
                  />

                  <Input placeholder="Food Name" value={name} onChange={(event) => setName(event.target.value)} />
                  <VariantRowsEditor rows={variantRows} onUpdate={updateVariantRow} onAdd={addVariantRow} onRemove={removeVariantRow} />
                  <Textarea
                    placeholder="Short description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Category" value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} />
                    <ImageUploadField image={image} onImageChange={setImage} isUploading={isUploadingImage} onUploadFile={handleUploadImage} />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Availability</p>
                      <p className="text-xs text-muted-foreground">Unavailable items cannot be ordered.</p>
                    </div>
                    <Switch checked={available} onCheckedChange={setAvailable} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="button" className="flex-1" onClick={saveEditor} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => startEdit(item)}
                  >
                    <SafeImage
                      src={item.image}
                      alt={item.name}
                      fallback={fallbackFor(activeGroup?.title || "", item.name)}
                      className="h-40 w-full overflow-hidden bg-muted"
                    />
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-lg leading-snug">{item.name}</h3>
                      {item.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{activeGroup?.title}</Badge>
                        <p className="font-bold text-primary">
                          Rs {Object.keys(item.prices || {}).length > 1 ? `${item.price}+` : item.price}
                        </p>
                      </div>
                      {item.prices && Object.keys(item.prices).length > 1 && (
                        <p className="text-xs font-medium text-muted-foreground">
                          {Object.entries(item.prices)
                            .map(([variant, value]) => `${variant} ${value}`)
                            .join("  ·  ")}
                        </p>
                      )}
                      {item.portions && Object.keys(item.portions).length > 0 && (
                        <p className="text-[11px] text-muted-foreground/80">
                          {Object.entries(item.portions)
                            .map(([variant, portion]) => `${variant} ${portion}`)
                            .join("  ·  ")}
                        </p>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          item.available
                            ? "w-fit bg-emerald-500/10 text-emerald-700 border-emerald-300"
                            : "w-fit bg-slate-500/10 text-slate-600 border-slate-300"
                        }
                      >
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            startEdit(item);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteItem(item.id, item.name);
                          }}
                          disabled={isDeletingId === item.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> {isDeletingId === item.id ? "..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          {searchQuery.trim() ? "No items match your search." : "No menu items left. Reload data source to restore."}
        </Card>
      )}
    </div>
  );
}