import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Search,
  Plus,
  Folder,
  Home,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default async function KBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* KB Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-6">
              <Link
                href="/kb"
                className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors"
              >
                <BookOpen className="h-6 w-6" />
                Knowledge Base
              </Link>
              
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/kb"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse
                </Link>
                <Link
                  href="/kb/categories"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Categories
                </Link>
              </nav>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/kb">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/kb/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Entry
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Chat
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Knowledge Base Management</span>
              <Separator orientation="vertical" className="h-4" />
              <Link href="/kb" className="hover:text-foreground transition-colors">
                Browse Articles
              </Link>
              <Link href="/kb/categories" className="hover:text-foreground transition-colors">
                Manage Categories
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by AI Assistant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}