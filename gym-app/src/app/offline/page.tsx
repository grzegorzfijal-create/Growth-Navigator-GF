import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <WifiOff className="size-10 text-muted" />
      <h1 className="text-xl font-bold">Brak połączenia</h1>
      <p className="max-w-sm text-sm text-muted">
        Rozpoczęty trening zapisuje się w pamięci telefonu i wyśle się automatycznie, gdy sieć wróci.
        Możesz spokojnie dokończyć serie.
      </p>
    </div>
  );
}
