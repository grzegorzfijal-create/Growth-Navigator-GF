"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Plus, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatDayMonth } from "@/lib/date";
import { createHealthToken, revokeHealthToken } from "@/server/actions/tokens";

export type TokenRow = {
  id: string;
  name: string;
  preview: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function CopyButton({ value, label = "Kopiuj" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast.error("Przeglądarka nie pozwoliła skopiować - zaznacz i skopiuj ręcznie.");
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Skopiowano" : label}
    </Button>
  );
}

/**
 * Synchronizacja masy ciała z aplikacji Zdrowie (a przez nią z wagi elektronicznej).
 * Apple nie udostępnia danych Zdrowia serwerowi, więc most stawia sam telefon:
 * Skrót czyta pomiar i wysyła go na ten adres z osobistym tokenem.
 */
export function HealthSyncSection({ tokens, origin }: { tokens: TokenRow[]; origin: string }) {
  const router = useRouter();
  const [name, setName] = useState("iPhone");
  const [pending, setPending] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Adres bierzemy z serwera (nagłówek Host), więc jest ten sam przy renderze i po stronie klienta.
  const endpoint = `${origin}/api/health/weight`;
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Waga elektroniczna zapisuje pomiar w aplikacji Zdrowie, a Skrót na iPhonie wysyła go tutaj -
        raz dziennie, automatycznie. Działa z każdą wagą, której aplikacja umie pisać do Zdrowia.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label>Adres, na który wysyła skrót</Label>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs">
            {endpoint || "..."}
          </code>
          <CopyButton value={endpoint} label="" />
        </div>
        {isLocal ? (
          <p className="text-xs text-warning">
            To adres lokalny - telefon go nie zobaczy. Po wdrożeniu aplikacji wróć tutaj i skopiuj adres publiczny.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tokeny dostępu</Label>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted">Brak tokenów. Wygeneruj jeden dla telefonu.</p>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Smartphone className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted">
                  ...{token.preview} - utworzony {formatDayMonth(token.createdAt.slice(0, 10), true)}
                  {token.lastUsedAt ? ` - ostatnio użyty ${formatDayMonth(token.lastUsedAt.slice(0, 10), true)}` : " - jeszcze nieużywany"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Unieważnij token"
                onClick={async () => {
                  if (!window.confirm(`Unieważnić token ${token.name}? Skrót przestanie działać.`)) return;
                  const result = await revokeHealthToken(token.id);
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success("Token unieważniony.");
                    router.refresh();
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="token-name">Nazwa urządzenia</Label>
          <Input id="token-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <Button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await createHealthToken(name);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setFresh(result.data!.token);
            router.refresh();
          }}
        >
          <Plus className="size-4" /> Wygeneruj
        </Button>
      </div>

      <Button variant="outline" onClick={() => setGuideOpen(true)}>
        Jak ustawić skrót na iPhonie
      </Button>

      {/* Token pokazujemy raz - potem w bazie jest już tylko jego hash. */}
      <Sheet open={fresh !== null} onOpenChange={(open) => !open && setFresh(null)}>
        <SheetContent
          title="Twój token"
          description="Zobaczysz go tylko teraz. Wklej do skrótu i zamknij to okno."
        >
          <code className="block break-all rounded-xl border border-border bg-surface-2 p-3 text-sm">{fresh}</code>
          <div className="mt-3 flex gap-2">
            <CopyButton value={fresh ?? ""} label="Kopiuj token" />
            <Button variant="ghost" onClick={() => setFresh(null)}>
              Gotowe
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent title="Skrót na iPhonie" description="Pięć minut raz, potem działa samo.">
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
            <li>
              Upewnij się, że aplikacja Twojej wagi zapisuje pomiary do <strong>Zdrowia</strong>{" "}
              (w aplikacji wagi: Ustawienia → Zdrowie / Apple Health → zezwól na zapis masy ciała).
            </li>
            <li>
              W aplikacji <strong>Skróty</strong> utwórz nowy skrót i dodaj akcję{" "}
              <strong>Znajdź próbki zdrowotne</strong>: typ <em>Masa ciała</em>, sortuj po dacie malejąco, limit 1.
            </li>
            <li>
              Dodaj akcję <strong>Pobierz zawartość URL</strong>:
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-muted">
                <li>URL: adres skopiowany powyżej</li>
                <li>Metoda: <strong>POST</strong></li>
                <li>Nagłówki: <code>Authorization</code> = <code>Bearer TWÓJ_TOKEN</code></li>
                <li>Treść żądania: <strong>JSON</strong>, pola <code>weight</code> (wartość próbki) i <code>date</code> (data próbki)</li>
              </ul>
            </li>
            <li>
              W zakładce <strong>Automatyzacja</strong> ustaw uruchamianie codziennie rano i wyłącz
              &bdquo;Pytaj przed uruchomieniem&rdquo;.
            </li>
          </ol>

          <p className="mt-4 text-xs text-muted">Treść żądania wygląda tak:</p>
          <pre className="mt-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 text-xs">{`{
  "weight": 84.2,
  "date": "2026-09-09"
}`}</pre>
          <p className="mt-3 text-xs text-muted">
            Możesz też wysłać całą historię naraz - pole <code>samples</code> z listą pomiarów. Ten sam
            dzień wysłany drugi raz nadpisuje wpis, nie tworzy duplikatu. Funty: dodaj <code>&quot;unit&quot;: &quot;lb&quot;</code>.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
