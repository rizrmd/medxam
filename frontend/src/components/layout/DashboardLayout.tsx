import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [pageTitle, setPageTitle] = useState('')

  // Map routes to titles
  const routeTitleMap: Record<string, string> = {
    '/back-office/dashboard': 'Dashboard',
    '/back-office/delivery': 'Manage Deliveries',
    '/back-office/test': 'Manage Exams',
    '/back-office/group': 'Manage Groups',
    '/back-office/category': 'Manage Categories',
    '/back-office/question-set': 'Manage Question Sets',
    '/back-office/question-pack': 'Manage Question Pack',
    '/back-office/test-taker': 'Manage Participants',
    '/back-office/scoring': 'Scoring of Deliveries',
    '/back-office/result': 'Result of Groups',
    '/back-office/profile': 'My Profile',
    '/back-office/user': 'Manage User',
    '/committee/deliveries': 'My Deliveries',
    '/scorer/dashboard': 'Scorer Dashboard',
  }

  useEffect(() => {
    let title = routeTitleMap[location.pathname]
    
    // Handle dynamic routes
    if (!title) {
      const pathname = location.pathname
      if (pathname.includes('/back-office/delivery/') && pathname !== '/back-office/delivery') {
        title = 'Configure Delivery'
      } else if (pathname.includes('/back-office/test/') && pathname !== '/back-office/test') {
        title = 'Configure Exam'
      } else if (pathname.includes('/back-office/group/') && pathname.includes('/participants')) {
        title = 'Authoring Group'
      } else if (pathname.includes('/back-office/question-set/') && pathname !== '/back-office/question-set') {
        title = 'Authoring Question Set'
      } else if (pathname.includes('/back-office/scoring/') && pathname !== '/back-office/scoring') {
        title = 'Scoring Detail'
      } else if (pathname.includes('/back-office/result/') && pathname !== '/back-office/result') {
        title = 'Result'
      } else if (pathname.match(/\/committee\/delivery\/\d+\/live-progress/)) {
        title = 'Live Participant Progress' // Fallback - should be set by useHeaderActions
      } else {
        title = 'MedXam'
      }
    }
    
    setPageTitle(title)
    document.title = `${title} - MedXam`
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="md:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-4">
            {/* Mobile spacer for menu button */}
            <div className="w-10 md:hidden" />
            {/* Page Title - can be overridden by useHeaderActions */}
            <div id="header-title" className="text-xl font-semibold text-gray-900" data-default-title={pageTitle}>
              {pageTitle}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Header Actions will be injected here by pages */}
            <div id="header-actions" className="flex items-center gap-2"></div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/back-office/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}