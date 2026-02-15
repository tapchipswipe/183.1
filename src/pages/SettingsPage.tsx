import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { user, profile, merchant } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    setBusinessName(merchant?.business_name ?? "");
    setIndustry(merchant?.industry ?? "");
  }, [merchant?.business_name, merchant?.industry]);

  const saveProfile = async () => {
    if (!profile?.id) return;
    await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", profile.id);
  };

  const saveMerchant = async () => {
    if (!merchant?.id) return;
    await supabase
      .from("merchants")
      .update({
        business_name: businessName.trim() || "My Business",
        industry: industry.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchant.id);
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
          <TabsTrigger value="merchant">Business</TabsTrigger>
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

        <TabsContent value="merchant" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Business</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Business Name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Industry</label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Retail, restaurant, service, ..." />
              </div>
              <Button size="sm" onClick={saveMerchant} disabled={!merchant?.id}>Save Business</Button>
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
