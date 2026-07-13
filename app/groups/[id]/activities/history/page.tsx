import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, History } from "lucide-react"
import Link from "next/link"
import { getGroupDetails } from "@/lib/actions"
import GroupActivityHistory from "@/components/group-activity-history"

interface PageProps {
  params: {
    id: string
  }
}

async function HistoryContent({ groupId }: { groupId: string }) {
  const result = await getGroupDetails(groupId)

  if (!result.success) {
    notFound()
  }

  const { group, members, activities } = result

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-toro-foreground flex items-center gap-2">
              <History className="w-8 h-8" />
              Historial de Actividades
            </h1>
            <p className="text-toro-foreground/70">
              {group.name} • {members.length} miembros • {activities.length} actividades
            </p>
          </div>
        </div>
      </div>

      {/* History Component */}
      <GroupActivityHistory groupId={groupId} members={members} activities={activities} />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded"></div>
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>

        <div className="h-32 bg-gray-200 rounded"></div>

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HistoryContent groupId={params.id} />
    </Suspense>
  )
}
