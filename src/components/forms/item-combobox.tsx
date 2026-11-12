"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Item } from "@/lib/types";

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getItemBadge(type: string): { label: string; className: string } {
  switch (type) {
    case "thanh_pham":
      return { label: "TP", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "ban_thanh_pham":
      return { label: "BTP", className: "bg-purple-100 text-purple-800 border-purple-200" };
    default:
      return { label: "NL", className: "bg-sky-100 text-sky-800 border-sky-200" };
  }
}

export function ItemCombobox({
  items,
  value,
  onChange,
  placeholder = "Tìm & chọn mặt hàng...",
  className = "",
  disabled = false,
}: {
  items: (Item & { on_hand?: number })[];
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedItem = useMemo(
    () => items.find((i) => i.id === value),
    [items, value],
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const cleanSearch = removeVietnameseTones(search);
    const tokens = cleanSearch.split(/\s+/).filter(Boolean);

    return items.filter((item) => {
      const cleanName = removeVietnameseTones(item.name);
      const cleanCode = removeVietnameseTones(item.code);
      const rawText = `${cleanName} ${cleanCode} ${item.type}`;
      return tokens.every((token) => rawText.includes(token));
    });
  }, [items, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const badge = selectedItem ? getItemBadge(selectedItem.type) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`h-8 w-full justify-between font-normal text-xs px-2.5 bg-white hover:bg-neutral-50 ${
            !selectedItem ? "text-muted-foreground" : "text-neutral-900"
          } ${className}`}
        >
          <div className="flex items-center gap-1.5 truncate text-left">
            {badge && (
              <span
                className={`text-[10px] font-bold px-1 py-0.2 rounded border shrink-0 ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
            <span className="truncate">
              {selectedItem
                ? `${selectedItem.name} (${selectedItem.code})${
                    selectedItem.packing_spec ? ` — ${selectedItem.packing_spec}` : ""
                  }`
                : placeholder}
            </span>
          </div>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(calc(100vw-2rem),440px)] p-0 z-[100] shadow-xl border-neutral-300"
      >
        {/* Search Input Box */}
        <div className="flex items-center border-b px-2.5 py-1.5 gap-2 bg-neutral-50 rounded-t-md">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gõ tên hoặc mã hàng (hỗ trợ vài trăm loại)..."
            className="h-8 text-xs border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent"
            autoFocus
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-neutral-900"
              onClick={() => setSearch("")}
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Results count hint */}
        <div className="px-3 py-1 bg-neutral-100/70 border-b flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Tìm thấy {filteredItems.length} mặt hàng</span>
          {search && <span className="italic">Lọc theo: &ldquo;{search}&rdquo;</span>}
        </div>

        {/* Item List */}
        <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 p-1">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Không tìm thấy mặt hàng nào phù hợp với &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemBadge = getItemBadge(item.type);
              const isSelected = item.id === value;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left p-2 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-neutral-100 text-neutral-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-1 py-0.2 rounded border ${itemBadge.className}`}
                      >
                        {itemBadge.label}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {item.name}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-500">
                        ({item.code})
                      </span>
                      {item.packing_spec && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.packing_spec}
                        </span>
                      )}
                    </div>
                    {typeof item.on_hand === "number" && (
                      <div className="text-[11px] text-neutral-500 mt-0.5 flex gap-3">
                        <span>
                          Tồn kho:{" "}
                          <strong className="text-neutral-700">
                            {item.on_hand} {item.unit}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
