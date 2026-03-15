import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit2, Bookmark, FolderOpen, ChevronDown, ChevronRight, Layers } from 'lucide-react';

export function CategoriesTab({
    categories = [],
    subcategories = [],
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory
}: any) {
    const [newCat, setNewCat] = useState({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newSubName, setNewSubName] = useState('');
    const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

    const safeCategories = categories || [];
    const safeSubcategories = subcategories || [];

    // Group subcategories by category
    const subcategoriesByCategory = useMemo(() => {
        const map: Record<string, any[]> = {};
        safeSubcategories.forEach((s: any) => {
            if (!map[s.category_id]) map[s.category_id] = [];
            map[s.category_id].push(s);
        });
        return map;
    }, [safeSubcategories]);

    const handleCreateCategory = async () => {
        if (!newCat.name) return;
        if (editingId) {
            await updateCategory?.(editingId, newCat);
            setEditingId(null);
        } else {
            await addCategory?.({ ...newCat, is_default: false });
        }
        setNewCat({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 });
    };

    const handleEditCategory = (cat: any) => {
        setEditingId(cat.id);
        setNewCat({ name: cat.name, color: cat.color || '#6366f1', icon: cat.icon || 'FolderOpen', sort_order: cat.sort_order || 0 });
    };

    const handleAddSubcategory = async (categoryId: string) => {
        if (!newSubName.trim()) return;
        await addSubcategory?.({ category_id: categoryId, name: newSubName.trim() });
        setNewSubName('');
        setAddingSubForCatId(null);
    };

    const handleUpdateSubcategory = async (subId: string) => {
        if (!editSubName.trim()) return;
        await updateSubcategory?.(subId, { name: editSubName.trim() });
        setEditingSubId(null);
        setEditSubName('');
    };

    const toggleExpand = (catId: string) => {
        setExpandedCatId(prev => prev === catId ? null : catId);
    };

    // Default category suggestions
    const defaultSuggestions = ['Rent', 'Electricity', 'Salary', 'Transport', 'Internet', 'Maintenance', 'Marketing', 'Office Supplies', 'Miscellaneous'];
    const existingNames = safeCategories.map((c: any) => c.name?.toLowerCase());
    const suggestions = defaultSuggestions.filter(s => !existingNames.includes(s.toLowerCase()));

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in duration-500">
            {/* Category Form */}
            <Card className="md:col-span-4 shadow-sm border h-fit">
                <CardHeader className="bg-muted/30 border-b py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bookmark className="text-purple-500 h-4 w-4" />
                        {editingId ? 'Edit Category' : 'New Category'}
                    </CardTitle>
                    <CardDescription className="text-xs">Organize expenses with categories \u0026 subcategories.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Name</Label>
                        <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Office Supplies" className="h-10 rounded-xl border-2" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Color</Label>
                        <div className="flex gap-2 items-center">
                            <input type="color" className="h-10 w-12 p-1 border-2 rounded-xl cursor-pointer" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} />
                            <span className="text-[10px] text-muted-foreground">For charts & badges</span>
                        </div>
                    </div>

                    {/* Quick suggestions */}
                    {!editingId && suggestions.length > 0 && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Quick Add</Label>
                            <div className="flex flex-wrap gap-1">
                                {suggestions.slice(0, 6).map(s => (
                                    <Button
                                        key={s}
                                        variant="outline"
                                        size="sm"
                                        className="text-[9px] h-6 px-2"
                                        onClick={() => setNewCat({ ...newCat, name: s })}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button onClick={handleCreateCategory} disabled={!newCat.name} className="w-full h-10 uppercase font-bold tracking-wider rounded-xl bg-purple-600 hover:bg-purple-700 text-sm">
                        <PlusCircle className="mr-2 h-3.5 w-3.5" /> {editingId ? 'Update' : 'Create'} Category
                    </Button>
                    {editingId && (
                        <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setNewCat({ name: '', color: '#6366f1', icon: 'FolderOpen', sort_order: 0 }); }}>
                            Cancel Edit
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Categories + Subcategories Table */}
            <Card className="md:col-span-8 shadow-sm border">
                <CardHeader className="border-b bg-muted/20 py-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-purple-500" /> Categories & Subcategories ({safeCategories.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-[10px] w-8"></TableHead>
                                <TableHead className="text-[10px] w-12">Color</TableHead>
                                <TableHead className="text-[10px]">Category Name</TableHead>
                                <TableHead className="text-[10px] text-center">Subcategories</TableHead>
                                <TableHead className="text-[10px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {safeCategories.map((c: any) => {
                                const subs = subcategoriesByCategory[c.id] || [];
                                const isExpanded = expandedCatId === c.id;

                                return (
                                    <React.Fragment key={c.id}>
                                        <TableRow className="hover:bg-muted/20">
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => toggleExpand(c.id)}
                                                >
                                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c.color || '#94a3b8' }} />
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm">{c.name}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-[9px]">
                                                    <Layers className="h-2.5 w-2.5 mr-0.5" /> {subs.length}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCategory(c)}>
                                                        <Edit2 className="h-3 w-3 text-amber-500" />
                                                    </Button>
                                                    {!c.is_default && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteCategory?.(c.id)}>
                                                            <Trash2 className="h-3 w-3 text-rose-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded subcategories */}
                                        {isExpanded && (
                                            <>
                                                {subs.map((sub: any) => (
                                                    <TableRow key={sub.id} className="bg-muted/10">
                                                        <TableCell></TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="pl-8" colSpan={1}>
                                                            {editingSubId === sub.id ? (
                                                                <div className="flex gap-1.5">
                                                                    <Input
                                                                        value={editSubName}
                                                                        onChange={e => setEditSubName(e.target.value)}
                                                                        className="h-7 text-xs flex-1"
                                                                        autoFocus
                                                                        onKeyDown={e => e.key === 'Enter' && handleUpdateSubcategory(sub.id)}
                                                                    />
                                                                    <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => handleUpdateSubcategory(sub.id)}>Save</Button>
                                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => setEditingSubId(null)}>Cancel</Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                                                    {sub.name}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingSubId(sub.id); setEditSubName(sub.name); }}>
                                                                    <Edit2 className="h-2.5 w-2.5 text-amber-500" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteSubcategory?.(sub.id)}>
                                                                    <Trash2 className="h-2.5 w-2.5 text-rose-500" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}

                                                {/* Add subcategory row */}
                                                <TableRow className="bg-muted/5">
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="pl-8" colSpan={1}>
                                                        {addingSubForCatId === c.id ? (
                                                            <div className="flex gap-1.5">
                                                                <Input
                                                                    value={newSubName}
                                                                    onChange={e => setNewSubName(e.target.value)}
                                                                    placeholder="Subcategory name"
                                                                    className="h-7 text-xs flex-1"
                                                                    autoFocus
                                                                    onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(c.id)}
                                                                />
                                                                <Button size="sm" className="h-7 text-[10px] px-2 bg-purple-600 hover:bg-purple-700" onClick={() => handleAddSubcategory(c.id)}>
                                                                    Add
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => { setAddingSubForCatId(null); setNewSubName(''); }}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[10px] gap-1 text-purple-600 hover:text-purple-700"
                                                                onClick={() => setAddingSubForCatId(c.id)}
                                                            >
                                                                <PlusCircle className="h-3 w-3" /> Add Subcategory
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell colSpan={2}></TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {safeCategories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-sm">
                                        No categories defined. Add categories to organize expenses.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
