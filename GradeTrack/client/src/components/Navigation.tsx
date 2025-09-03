import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Search, Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Role-specific navigation
  const navigation = [
    { name: "Dashboard", href: "/", current: location === "/" },
    ...(user?.role === "admin"
      ? [
          { name: "Students", href: "/students", current: location === "/students" },
          { name: "Teachers", href: "/teachers", current: location === "/teachers" },
          { name: "Classes", href: "/classes", current: location === "/classes" },
          { name: "Grades", href: "/grades", current: location === "/grades" },
          { name: "Assignments", href: "/assignments", current: location === "/assignments" },
        ]
      : []),
    ...(user?.role === "student"
      ? [
          { name: "Classes", href: "/classes", current: location === "/classes" }, // StudentClasses page
          { name: "Grades", href: "/grades", current: location === "/grades" },
          { name: "Assignments", href: "/assignments", current: location === "/assignments" },
        ]
      : []),
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search:", searchQuery);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">SchoolTrack</h1>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <span
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        item.current
                          ? "text-primary bg-primary/10"
                          : "text-gray-600 hover:text-primary hover:bg-gray-50"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end max-w-md">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="search"
                  placeholder="Search students, grades..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>

          {/* User & Logout */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:inline-flex"
              >
                Logout
              </Button>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <span
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    item.current
                      ? "text-primary bg-primary/10"
                      : "text-gray-600 hover:text-primary hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
