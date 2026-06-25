import { useState } from 'react';
import { useCustomItems, CustomItem } from '@/hooks/useCustomItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { ItemCard } from './ItemCard';

const EMOJI_OPTIONS = ['📦', '🎁', '📚', '🎮', '🎵', '🔧', '🎨', '⚽', '🎒', '💼', '🧸', '🪥', '🧴', '💍', '🎸', '🏋️'];

interface CustomItemsSectionProps {
  selectedItems: string[];
  onToggleItem: (id: string) => void;
}

export function CustomItemsSection({ selectedItems, onToggleItem }: CustomItemsSectionProps) {
  const { items, isLoading, addItem, updateItem, deleteItem } = useCustomItems();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    setIsSaving(true);
    const success = await addItem(newName, newIcon);
    setIsSaving(false);
    if (success) {
      setNewName('');
      setNewIcon('📦');
      setIsAddOpen(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    const success = await updateItem(editingItem.id, newName, newIcon);
    setIsSaving(false);
    if (success) {
      setEditingItem(null);
      setIsEditOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
  };

  const openEditDialog = (item: CustomItem) => {
    setEditingItem(item);
    setNewName(item.name);
    setNewIcon(item.icon);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Custom Items
          </h3>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong border-0 rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Custom Item</DialogTitle>
              <DialogDescription>
                Create a custom item to track with your reminders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  placeholder="e.g., Gym Bag"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={30}
                  className="input-premium rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Choose an Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        newIcon === emoji
                          ? 'bg-primary/20 ring-2 ring-primary scale-110'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={isSaving || !newName.trim()}
                className="btn-premium rounded-xl"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 glass rounded-2xl">
          <p className="text-muted-foreground">No custom items yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your own items to track!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <ItemCard
                item={{
                  id: `custom_${item.id}`,
                  name: item.name,
                  icon: item.icon,
                  category: 'custom' as const,
                }}
                isSelected={selectedItems.includes(`custom_${item.id}`)}
                onToggle={onToggleItem}
              />
              {/* Edit/Delete buttons on hover */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(item);
                  }}
                  className="p-1.5 rounded-lg bg-background/80 hover:bg-background shadow-sm"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-background/80 hover:bg-destructive/10 shadow-sm"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-strong border-0 rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this custom item.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-strong border-0 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={30}
                className="input-premium rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose an Icon</label>
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewIcon(emoji)}
                    className={`w-10 h-10 text-xl rounded-lg transition-all ${
                      newIcon === emoji
                        ? 'bg-primary/20 ring-2 ring-primary scale-110'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSaving || !newName.trim()}
              className="btn-premium rounded-xl"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
