import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import {
  createBridgeMenuItem,
  deleteBridgeMenuItem,
  fetchBridgeMenuGroups,
  getBridgeMenuGroups,
  subscribeBridgeMenu,
  updateBridgeMenuItem,
} from "@/lib/bridge";

export default function MenuManagement() {
  const [menuGroups, setMenuGroups] = useState(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "non-veg-chakhna");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [categoryTitle, setCategoryTitle] = useState(menuGroups[0]?.title || "");
  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

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

  async function handleDeleteItem(itemId: number, itemName: string) {
    const ok = window.confirm(`Delete menu item "${itemName}" from admin menu?`);
    if (!ok) return;

    await deleteBridgeMenuItem(itemId);
    await reloadMenu();
  }

  function startEdit(item: { id: number; name: string; price: number; image: string }, groupTitle: string) {
    setEditingItemId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setImage(item.image || "");
    setCategoryTitle(groupTitle);
  }

  function resetForm() {
    setEditingItemId(null);
    setName("");
    setPrice("");
    setImage("");
    setCategoryTitle(activeGroup?.title || "");
  }

  async function submitMenuItem() {
    if (!name.trim() || !categoryTitle.trim()) return;
    const numericPrice = Number(price || 0);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return;

    if (editingItemId) {
      await updateBridgeMenuItem(editingItemId, {
        name: name.trim(),
        price: numericPrice,
        image: image.trim() || undefined,
        categoryId: activeGroup?.title === categoryTitle.trim() ? activeGroup?.id : undefined,
        categoryTitle: categoryTitle.trim(),
      });
    } else {
      await createBridgeMenuItem({
        categoryId: activeGroup?.title === categoryTitle.trim() ? activeGroup?.id : undefined,
        categoryTitle: categoryTitle.trim(),
        name: name.trim(),
        price: numericPrice,
        image: image.trim() || undefined,
      });
    }

    await reloadMenu();
    resetForm();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Add, update, and delete menu items. User side uses the same menu source.</p>
        </div>
      </div>

      <Card className="p-4 space-y-3 border-blue-200 bg-blue-50/40">
        <h2 className="font-semibold">{editingItemId ? "Update Menu Item" : "Add Menu Item"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Food Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Price" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
          <Input placeholder="Category (e.g. Main Course)" value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} />
          <Input placeholder="Image URL (optional)" value={image} onChange={(event) => setImage(event.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={submitMenuItem}>{editingItemId ? "Update Item" : "Add Item"}</Button>
          {editingItemId && (
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {menuGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroupId(group.id)}
            className={
              activeGroupId === group.id
                ? "px-4 py-2 rounded-full bg-primary text-primary-foreground"
                : "px-4 py-2 rounded-full bg-muted text-foreground"
            }
          >
            {group.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeGroup?.items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <img src={item.image} alt={item.name} className="w-full h-40 object-cover" />
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{activeGroup.title}</Badge>
                <p className="font-bold text-primary">Rs {item.price}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => startEdit(item, activeGroup.title)}>
                Update
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleDeleteItem(item.id, item.name)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {menuGroups.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No menu items left. Reload data source to restore.</Card>
      )}
    </div>
  );
}
