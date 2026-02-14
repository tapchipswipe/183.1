import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ArrowRight } from "lucide-react";

const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please verify your email address before signing in.",
  "User already registered": "An account with this email already exists. Try signing in.",
  "Password should be at least 6 characters": "Password must be at least 6 characters long.",
  "Signup requires a valid password": "Please enter a valid password.",
};

const STORE_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "convenience", label: "Convenience" },
  { value: "service", label: "Service" },
  { value: "restaurant", label: "Restaurant" },
  { value: "wholesale", label: "Wholesale" },
  { value: "other", label: "Other" },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [storeType, setStoreType] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        if (password.length < 6) {
          toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              company_name: companyName || "My Company",
              store_type: storeType || null,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      }
    } catch (error: any) {
      const friendlyMsg = AUTH_ERROR_MAP[error.message] || error.message;
      toast({ title: isLogin ? "Sign in failed" : "Sign up failed", description: friendlyMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Business Insights</h1>
          <p className="text-xs text-muted-foreground">Intelligence platform for your business</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{isLogin ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription className="text-xs">
              {isLogin ? "Enter your credentials to continue" : "Set up your company workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="storeType" className="text-xs">Store Type</Label>
                    <Select value={storeType} onValueChange={setStoreType}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select your store type" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-sm">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-8 text-sm" />
              </div>
              <Button type="submit" className="h-8 w-full text-sm" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign in" : "Create account"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
