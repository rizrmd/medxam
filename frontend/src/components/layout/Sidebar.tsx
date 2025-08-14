import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Tags,
  FileQuestion,
  Search,
  UserCheck,
  Calculator,
  ChartBar,
  User,
  Shield,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalState } from '@/hooks/useLocalState'

const menuSections = [
  {
    items: [
      { name: 'Dashboard', path: '/back-office/dashboard', icon: LayoutDashboard },
      { name: 'Deliveries', path: '/back-office/delivery', icon: Package },
      { name: 'Exams', path: '/back-office/test', icon: FileText },
      { name: 'Groups', path: '/back-office/group', icon: Users },
    ]
  },
  {
    label: 'Manage',
    items: [
      { name: 'Categories', path: '/back-office/category', icon: Tags },
      { name: 'Question Sets', path: '/back-office/question-set', icon: FileQuestion },
      { name: 'Search Questions', path: '/back-office/question-pack', icon: Search },
      { name: 'Candidates', path: '/back-office/test-taker', icon: UserCheck },
    ]
  },
  {
    label: 'Reports',
    items: [
      { name: 'Scoring', path: '/back-office/scoring', icon: Calculator },
      { name: 'Results', path: '/back-office/result', icon: ChartBar },
    ]
  },
  {
    label: 'Settings',
    items: [
      { name: 'My Profile', path: '/back-office/profile', icon: User },
      { name: 'Users & Access', path: '/back-office/user', icon: Shield },
    ]
  }
]

export function Sidebar() {
  const location = useLocation()
  const [state, setState] = useLocalState({ isOpen: false })

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setState.isOpen = !state.isOpen}
      >
        {state.isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {state.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setState.isOpen = false}
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
            <h2 className="text-xl font-bold">IoNbEc Admin</h2>
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
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            onClick={() => setState.isOpen = false}
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
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}