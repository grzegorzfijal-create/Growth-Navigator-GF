# Wersja jednoplikowa (artefakt na claude.ai)

`93-trening.html` to samodzielna wersja aplikacji: jeden plik, zero backendu.
Powstała po to, żeby dało się kliknąć narzędzie na telefonie bez stawiania serwera
i bazy - jest opublikowana jako prywatny artefakt na claude.ai.

**Czym różni się od pełnej aplikacji w `gym-app/`:**

| | `gym-app` (Next.js) | `standalone` (jeden plik) |
|---|---|---|
| Backend | serwer + PostgreSQL | brak, dane w bazie artefaktu i w przeglądarce |
| Konta | rejestracja, hasła, sesje | brak - dostęp ma właściciel artefaktu |
| Zakres | plany, kalendarz, historia z filtrami, statystyki, wnioski | plan, tryb treningu, historia, progresja, dieta, suplementy |
| Zastosowanie | docelowa aplikacja do wdrożenia | szybkie kliknięcie na telefonie, prototyp UX |

Logika liczenia (tabela RPE, szacowane 1RM, podwójna progresja, Mifflin-St Jeor)
jest ta sama co w `src/lib/training.ts` i `src/lib/nutrition.ts` - tutaj przepisana
na zwykły JavaScript, żeby plik nie potrzebował builda.

Publikacja zmian: ten sam plik trzeba opublikować ponownie pod tym samym adresem
artefaktu (inaczej powstanie osobna kopia).
