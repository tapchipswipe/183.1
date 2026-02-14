import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";

export default function SettingsPage() {
  const { user, profile, userRole } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  const saveProfile = async () => {
    if (!profile?.id) return;
    await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", profile.id);
  };

  const saveCompany = async () => {
    if (!userRole?.company_id) return;
    await supabase
      .from("companies")
      .update({ name: companyName.trim() || "My Company", default_currency: currency })
      .eq("id", userRole.company_id);
  };

  const updatePassword = async () => {
    if (!password.trim()) return;
    await supabase.auth.updateUser({ password: password.trim() });
    setPassword("");
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="h-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button size="sm" onClick={saveProfile}>Save Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Company</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Company Name</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Default Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={saveCompany}>Save Company</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Theme</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Current theme: {theme}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setTheme("light")}>Light</Button>
                <Button size="sm" variant="outline" onClick={() => setTheme("dark")}>Dark</Button>
                <Button size="sm" variant="outline" onClick={() => setTheme("system")}>System</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Password</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
              />
              <Button size="sm" onClick={updatePassword}>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
