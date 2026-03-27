"use client";

import { useId, type ReactNode } from "react";
import { CircleHelp, X } from "lucide-react";
import { Popover } from "radix-ui";

/** Optional explanations that also work with touch and keyboard input. */
export function HelpPopover({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const descriptionId = useId();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Ayuda sobre ${label.toLocaleLowerCase("es")}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={16}
          aria-label={label}
          aria-describedby={descriptionId}
          className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-md"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{label}</p>
            <Popover.Close
              aria-label="Cerrar ayuda"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </Popover.Close>
          </div>
          <div
            id={descriptionId}
            className="text-sm leading-6 text-muted-foreground"
          >
            {children}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
