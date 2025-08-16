import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLocalState } from "@/hooks/useLocalState";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  Award,
  Calculator,
  ChartBar,
  ClipboardCheck,
  FileQuestion,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Shield,
  Tags,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="md:pl-64">
        <Outlet />
      </main>
    </div>
  );
}
// Full admin menu
const adminMenuSections = [
  {
    items: [
      {
        name: "Dashboard",
        path: "/back-office/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Assignment Overview",
        path: "/back-office/assignments",
        icon: UserCheck,
      },
      { name: "Deliveries", path: "/back-office/delivery", icon: Package },
      { name: "Exams", path: "/back-office/test", icon: FileText },
      { name: "Groups", path: "/back-office/group", icon: Users },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Categories", path: "/back-office/category", icon: Tags },
      {
        name: "Question Sets",
        path: "/back-office/question-set",
        icon: FileQuestion,
      },
      {
        name: "Search Questions",
        path: "/back-office/question-pack",
        icon: Search,
      },
      {
        name: "Participants",
        path: "/back-office/participants",
        icon: UserCheck,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Scoring", path: "/back-office/scoring", icon: Calculator },
      { name: "Results", path: "/back-office/result", icon: ChartBar },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "My Profile", path: "/back-office/profile", icon: User },
      { name: "Users & Access", path: "/back-office/user", icon: Shield },
      {
        name: "Committee & Scorers",
        path: "/back-office/committee-scorers",
        icon: UserCheck,
      },
    ],
  },
];

// Committee/Scorer menu (limited access)
const committeeMenuSections = [
  {
    items: [
      {
        name: "Dashboard",
        path: "/back-office/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "My Deliveries",
        path: "/committee/deliveries",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Scoring",
    items: [
      { name: "Active Scoring", path: "/back-office/scoring", icon: Award },
      { name: "Results Review", path: "/back-office/result", icon: ChartBar },
    ],
  },
  {
    label: "Settings",
    items: [{ name: "My Profile", path: "/back-office/profile", icon: User }],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useLocalState({ isOpen: false });
  const { user, logout } = useAuthStore();

  // Determine which menu to show based on user roles
  const hasAdminRole = user?.roles?.some(
    (role) => role.name === "Administrator" || role.name === "administrator"
  );

  const hasCommitteeRole = user?.roles?.some(
    (role) =>
      role.name === "Scorer / Committee" ||
      role.name === "scorer" ||
      role.name === "committee"
  );

  // Select appropriate menu sections
  // Admin role takes precedence
  const menuSections = hasAdminRole
    ? adminMenuSections
    : hasCommitteeRole
    ? committeeMenuSections
    : adminMenuSections; // Default to admin menu if no specific role

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => (setState.isOpen = !state.isOpen)}
      >
        {state.isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Overlay for mobile */}
      {state.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => (setState.isOpen = false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 transform bg-white border-r transition-transform duration-200 ease-in-out",
          state.isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b px-6">
            <h2 className="text-xl font-bold">MedXam Admin</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {section.label && (
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            onClick={() => (setState.isOpen = false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* User Info - Sticky at bottom */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">
                      {user?.name || user?.email || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {hasAdminRole ? "Administrator" : hasCommitteeRole ? "Committee/Scorer" : "User"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    navigate("/back-office/profile");
                    setState.isOpen = false;
                  }}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
