import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import WorkForm from "@/components/WorkForm";

const NewWork = () => {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Lägg till nytt verk</CardTitle>
        <CardDescription>Registrera ett nytt verk i katalogen</CardDescription>
      </CardHeader>
      <CardContent>
        <WorkForm />
      </CardContent>
    </Card>
  );
};

export default NewWork;
