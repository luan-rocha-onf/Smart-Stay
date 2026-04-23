import { MapPin } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-card px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">Smart Stay</h1>
            <p className="text-xs text-muted-foreground">O hotel barato pode sair caro</p>
          </div>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Onfly Smart Route Optimizer
        </span>
      </div>
    </header>
  );
}
