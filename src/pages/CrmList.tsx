import { Link } from "react-router-dom";
import { useFollowUps, useUpdateActivity, typeMeta } from "@/hooks/useCrm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, User, AlarmClock } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().split("T")[0];

const clientName = (c: { first_name: string | null; last_name: string | null; organization: string | null }) => {
  const person = `${c.first_name || ""} ${c.last_name || ""}`.trim();
  return person || c.organization || "Okänd klient";
};

const CrmList = () => {
  const { data: followUps, isLoading } = useFollowUps();
  const update = useUpdateActivity();

  const markDone = async (id: string) => {
    try {
      await update.mutateAsync({ id, status: "done", completed_at: new Date().toISOString() });
      toast.success("Uppföljning klar");
    } catch {
      toast.error("Kunde inte uppdatera");
    }
  };

  const t = today();
  const overdue = (followUps ?? []).filter((f) => f.follow_up_date! < t);
  const dueToday = (followUps ?? []).filter((f) => f.follow_up_date === t);
  const upcoming = (followUps ?? []).filter((f) => f.follow_up_date! > t);

  const sections = [
    { title: "Förfallna", items: overdue, empty: "Inga förfallna uppföljningar" },
    { title: "Idag", items: dueToday, empty: "Inga uppföljningar idag" },
    { title: "Kommande", items: upcoming, empty: "Inga kommande uppföljningar" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Uppföljningar från klienternas aktivitetslogg. Markera "Klar" när uppgiften är gjord.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Laddar...</p>}

      {!isLoading && (followUps?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Inga öppna uppföljningar. Lägg till aktiviteter med uppföljningsdatum på klientsidorna.
            </p>
          </CardContent>
        </Card>
      )}

      {sections.map(({ title, items, empty }) => (
        items.length > 0 || title === "Förfallna" ? (
          <Card key={title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {title === "Förfallna" && <AlarmClock className="h-4 w-4 text-destructive" />}
                {title}
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{empty}</p>
              ) : (
                <ul className="divide-y">
                  {items.map((f) => {
                    const meta = typeMeta[f.activity_type] ?? typeMeta.note;
                    const Icon = meta.icon;
                    const isCompany = !f.clients?.first_name;
                    return (
                      <li key={f.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/clients/${f.client_id}`}
                              className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                            >
                              {f.clients ? clientName(f.clients) : "Okänd klient"}
                            </Link>
                            {f.clients && (isCompany ? <Building2 className="h-3 w-3 text-amber-500" /> : <User className="h-3 w-3 text-violet-400" />)}
                            <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                          </div>
                          <p className="mt-0.5 text-sm">{f.subject}</p>
                          {f.body && <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-2">{f.body}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">{f.follow_up_date}</span>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => markDone(f.id)}>
                            <Check className="h-3 w-3" /> Klar
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null
      ))}
    </div>
  );
};

export default CrmList;
