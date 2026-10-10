import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";

const ROLES = [
  { id: "artist", label: "Artist" },
  { id: "producer", label: "Musikproducent" },
  { id: "customer", label: "Kund (produktionsbolag)" },
] as const;

const clientName = (c: { first_name: string; last_name: string; organization: string | null }) =>
  `${c.first_name} ${c.last_name}`.trim() || c.organization || "–";

const ReleaseClients = ({ albumKey }: { albumKey: string }) => {
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const [role, setRole] = useState<string>("producer");
  const [search, setSearch] = useState("");

  const { data: links = [] } = useQuery({
    queryKey: ["release-clients", albumKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("release_clients").select("*").eq("album_key", albumKey);
      if (error) throw error;
      return data;
    },
  });
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["release-clients", albumKey] });

  const add = useMutation({
    mutationFn: async (client_id: string) => {
      const { error } = await supabase.from("release_clients").insert({ album_key: albumKey, client_id, role });
      if (error) throw error;
    },
    onSuccess: () => { setSearch(""); refresh(); },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Redan kopplad med den rollen" : e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("release_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const options = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return [];
    return clients.filter((c) => clientName(c).toLowerCase().includes(t) || c.organization?.toLowerCase().includes(t)).slice(0, 10);
  }, [clients, search]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden p-4 space-y-4">
      <div>
        <h2 className="font-semibold">Royaltyberättigade klienter</h2>
        <p className="text-xs text-muted-foreground">Klienter som kan ha rätt till royalties på releasen enligt avtal. Automatiska kopplingar är gjorda på exakt namn.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => {
          const rows = links.filter((l) => l.role === r.id);
          return (
            <div key={r.id}>
              <div className="text-xs font-medium text-muted-foreground mb-1">{r.label}</div>
              {rows.length === 0 && <div className="text-sm text-muted-foreground">–</div>}
              <ul className="space-y-1">
                {rows.map((l) => {
                  const c = clientMap.get(l.client_id);
                  return (
                    <li key={l.id} className="flex items-center gap-1 text-sm">
                      <Link to={`/clients/${l.client_id}`} className="text-primary hover:underline truncate">{c ? clientName(c) : "…"}</Link>
                      {l.auto && <Badge variant="outline" className="text-[10px] px-1 py-0">auto</Badge>}
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" title="Ta bort" onClick={() => remove.mutate(l.id)}><X className="h-3 w-3" /></Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Input placeholder="Sök klient att koppla…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {options.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border bg-popover shadow">
              {options.map((c) => (
                <button key={c.id} type="button" onClick={() => add.mutate(c.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                  {clientName(c)}{c.organization && clientName(c) !== c.organization ? <span className="text-muted-foreground"> · {c.organization}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReleaseClients;
