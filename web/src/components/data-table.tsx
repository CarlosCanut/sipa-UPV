"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowRight, Search } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export type TableRowData = {
  id: string;
  href?: string;
  [key: string]: string | number | null | undefined;
};
export function DataTable({
  columns,
  rows,
  label = "Buscar…",
}: {
  columns: { key: string; label: string }[];
  rows: TableRowData[];
  label?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const definitions = useMemo<ColumnDef<TableRowData>[]>(
    () =>
      columns.map(({ key, label }, index) => ({
        accessorKey: key,
        header: label,
        cell: ({ row, getValue }) =>
          index === 0 && row.original.href ? (
            <Link
              className="inline-flex items-center gap-3 font-medium text-primary hover:underline"
              href={row.original.href}
            >
              {String(getValue() ?? "—")}
              <ArrowRight size={14} />
            </Link>
          ) : (
            String(getValue() ?? "—")
          ),
      })),
    [columns],
  );
  // TanStack manages row models; its API intentionally is not compiler-memoizable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: definitions,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 30 } },
    getRowId: (row) => row.id,
  });
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="bg-card pl-9"
            aria-label={label}
            placeholder={label}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} registros
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="bg-muted/50">
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 px-5">
                    <button
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex items-center gap-2 text-xs font-medium"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <ArrowDownUp size={12} />
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-5 py-4 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No hay registros que mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-3 text-xs">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Siguiente
          </Button>
        </div>
      )}
    </section>
  );
}
