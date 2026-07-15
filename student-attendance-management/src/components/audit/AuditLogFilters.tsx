import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_ENTITY_LABELS,
  SUPERVISOR_OPERATIONAL_ENTITIES,
} from "@/lib/audit/constants";
import type { AuditLogFilters, AuditScope } from "@/lib/audit/types";
import { Search, RotateCcw } from "lucide-react";

type AuditLogFiltersProps = {
  scope: AuditScope;
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
  onApply: () => void;
  onReset: () => void;
  showClassFilter?: boolean;
  classOptions?: { id: string; name: string }[];
};

const EMPTY_OPTION = "__all__";

export function AuditLogFilters({
  scope,
  filters,
  onChange,
  onApply,
  onReset,
  showClassFilter = false,
  classOptions = [],
}: AuditLogFiltersProps) {
  const entityOptions =
    scope === "supervisor"
      ? SUPERVISOR_OPERATIONAL_ENTITIES
      : scope === "teacher"
        ? (["AttendanceRecord", "LeaveRequest", "User"] as const)
        : AUDIT_ENTITIES;

  const update = (patch: Partial<AuditLogFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Hành động</label>
          <Select
            value={filters.action || EMPTY_OPTION}
            onValueChange={(v) =>
              update({ action: v === EMPTY_OPTION ? "" : (v as AuditLogFilters["action"]) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_OPTION}>Tất cả</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Đối tượng</label>
          <Select
            value={filters.entity || EMPTY_OPTION}
            onValueChange={(v) =>
              update({ entity: v === EMPTY_OPTION ? "" : (v as AuditLogFilters["entity"]) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_OPTION}>Tất cả</SelectItem>
              {entityOptions.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {AUDIT_ENTITY_LABELS[entity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Từ ngày</label>
          <Input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Đến ngày</label>
          <Input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </div>

        {showClassFilter && classOptions.length > 0 && (
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-500">Lớp</label>
            <Select
              value={filters.classId || EMPTY_OPTION}
              onValueChange={(v) =>
                update({ classId: v === EMPTY_OPTION ? undefined : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Tất cả lớp</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-medium text-zinc-500">Tìm kiếm</label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              className="pl-9"
              placeholder="Người thực hiện, entity ID..."
              value={filters.search ?? ""}
              onChange={(e) => update({ search: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onApply} size="sm">
          Áp dụng
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={14} className="mr-1" />
          Đặt lại
        </Button>
      </div>
    </div>
  );
}
