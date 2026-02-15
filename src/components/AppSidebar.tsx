import {
  BarChart3,
  LayoutDashboard,
  Sparkles,
  Lightbulb,
  Network,
  Package,
  ArrowLeftRight,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const one82Nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Products", url: "/products", icon: Package },
  { title: "Integrations", url: "/integrations", icon: Network },
  { title: "Insights", url: "/insights", icon: Sparkles },
  { title: "Recommendations", url: "/recommendations", icon: Lightbulb },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { profile, merchant, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar className="flex h-screen w-[300px] flex-col border-r bg-sidebar">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
            <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-sidebar-foreground">One82</span>
            <span className="text-2xs text-sidebar-foreground/60">{merchant?.business_name ?? "Workspace"}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="flex-1 overflow-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {one82Nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm">
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto space-y-1 border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {theme === "light" && <Sun className="h-3.5 w-3.5" />}
          {theme === "dark" && <Moon className="h-3.5 w-3.5" />}
          {theme === "system" && <Monitor className="h-3.5 w-3.5" />}
          {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent text-2xs font-medium text-sidebar-accent-foreground">
                {(profile?.full_name?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="truncate text-xs font-medium">{profile?.full_name || profile?.email || "User"}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={signOut} className="text-xs">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
