import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const checks = [
  "No PAN/CVV stored in app tables",
  "Tokenized card references only",
  "Audit logging required for privileged actions",
  "Role-based access controls enforced",
  "Encrypted transport and storage defaults",
  "Retention controls for raw references",
];

export default function Compliance() {
  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Compliance</h1>
      <p className="text-xs text-muted-foreground">PCI-aware baseline controls for processor intelligence workflows.</p>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Monitoring Checklist</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checks.map((item) => (
              <li key={item} className="rounded-md border px-3 py-2 text-xs">{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
