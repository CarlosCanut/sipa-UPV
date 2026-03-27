"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowRight,
  ArrowUp,
  Search,
  X,
} from "lucide-react";
import { HelpPopover } from "@/components/help-popover";
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
  columns: { key: string; label: string; help?: string }[];
  rows: TableRowData[];
  label?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const clearSearch = () => {
    setFilter("");
    searchRef.current?.focus();
  };
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
              <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            className="bg-card pr-9 pl-9"
            aria-label={label}
            placeholder={label}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={clearSearch}
              className="absolute top-0.5 right-0.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <span
          role="status"
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
        >
          {table.getFilteredRowModel().rows.length}
          {filter ? ` de ${rows.length}` : ""} registros
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="bg-muted/50">
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-12 px-5"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex min-h-9 items-center gap-2 rounded-sm text-xs font-medium hover:text-primary"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp size={14} aria-hidden="true" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown size={14} aria-hidden="true" />
                        ) : (
                          <ArrowDownUp size={12} aria-hidden="true" />
                        )}
                      </button>
                      {columns.find((column) => column.key === header.column.id)
                        ?.help && (
                        <HelpPopover
                          label={String(header.column.columnDef.header)}
                        >
                          {
                            columns.find(
                              (column) => column.key === header.column.id,
                            )?.help
                          }
                        </HelpPopover>
                      )}
                    </div>
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
                    <TableCell
                      key={cell.id}
                      className="max-w-sm px-5 py-4 text-sm whitespace-normal break-words tabular-nums"
                    >
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
                  className="h-44 px-5 text-center whitespace-normal"
                >
                  <p className="font-medium">
                    {filter
                      ? "No hay coincidencias"
                      : "Todavía no hay registros"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filter
                      ? "Prueba con otro nombre o limpia la búsqueda para ver todos los registros."
                      : "Los datos aparecerán aquí cuando estén disponibles."}
                  </p>
                  {filter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={clearSearch}
                    >
                      Mostrar todos los registros
                    </Button>
                  )}
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
