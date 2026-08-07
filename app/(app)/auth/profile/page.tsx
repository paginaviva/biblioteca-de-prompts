import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserProfile } from "@/components/auth/UserProfile"
import { parseUIPreferences } from "@/lib/ui-preferences"

export const dynamic = 'force-dynamic'

// Server component: reads the account language and full UI preferences from
// the database and passes them as initial props to the client profile, so the
// tabs render without a loading flash (preferred over a client-side fetch).
export default async function ProfilePage() {
  const session = await auth()

  let initialLanguage: string | null = null
  let initialPreferences = parseUIPreferences(null)

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, uiPreferences: true },
    })
    initialLanguage = user?.language ?? null
    initialPreferences = parseUIPreferences(user?.uiPreferences)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-5xl mx-auto">
        <UserProfile
          initialLanguage={initialLanguage}
          initialPreferences={initialPreferences}
        />
      </div>
    </div>
  )
}
