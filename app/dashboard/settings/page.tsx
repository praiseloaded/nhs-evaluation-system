import { Navbar } from '@/components/navbar'
import { Bell, Lock, Palette } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground dark:text-slate-400">
            Manage your preferences and application settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Account Settings</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                  Manage your account information, password, and security settings.
                </p>
                <button className="text-primary hover:underline font-medium text-sm dark:text-blue-400">
                  Manage Account →
                </button>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-950">
                <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                  Control how and when you receive notifications about analysis results and updates.
                </p>
                <button className="text-primary hover:underline font-medium text-sm dark:text-blue-400">
                  Configure Notifications →
                </button>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950">
                <Palette className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Display Settings</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                  Customize the appearance and layout of the evaluation engine. Use the theme switcher in the top navigation to toggle between light and dark modes.
                </p>
                <button className="text-primary hover:underline font-medium text-sm dark:text-blue-400">
                  Customize Appearance →
                </button>
              </div>
            </div>
          </div>

          {/* Export Data */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Export Data</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                  Download all your analyses and evaluation data in various formats.
                </p>
                <button className="text-primary hover:underline font-medium text-sm dark:text-blue-400">
                  Export Data →
                </button>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Help & Support</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                  Get help with using the NHS Evaluation Engine, learn about features, and contact support.
                </p>
                <button className="text-primary hover:underline font-medium text-sm dark:text-blue-400">
                  Get Help →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground dark:text-slate-500">
          <p>NHS Evaluation Engine v1.0 • All rights reserved</p>
        </div>
      </main>
    </div>
  )
}
