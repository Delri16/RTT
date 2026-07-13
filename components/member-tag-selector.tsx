"use client"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Users, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { supabase } from "@/lib/supabase"

interface Member {
  username: string
  avatar?: string
  avatar_url?: string
}

interface MemberTagSelectorProps {
  groupId: string
  currentUsername: string
  selectedMembers: string[]
  onMembersChange: (members: string[]) => void
}

export default function MemberTagSelector({
  groupId,
  currentUsername,
  selectedMembers,
  onMembersChange,
}: MemberTagSelectorProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!groupId) {
      return
    }

    const loadMembers = async () => {
      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("group_members")
          .select(`
            username,
            profiles (avatar, avatar_url)
          `)
          .eq("group_id", groupId)
          .neq("username", currentUsername)

        if (!error && data) {
          const membersList = data.map((m: any) => ({
            username: m.username,
            avatar: m.profiles?.avatar,
            avatar_url: m.profiles?.avatar_url,
          }))
          setMembers(membersList)
        }
      } catch (error) {
        console.error("Error loading members:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [groupId, currentUsername])

  const handleCheckboxChange = (username: string, checked: boolean) => {
    const newSelectedMembers = checked ? [...selectedMembers, username] : selectedMembers.filter((m) => m !== username)

    onMembersChange(newSelectedMembers)
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        <Users className="w-6 h-6 mx-auto mb-2 opacity-50 animate-pulse" />
        <p className="text-sm">Cargando miembros...</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <Users className="w-6 h-6 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No hay otros miembros en este grupo</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-toro-primary" />
              <span className="font-medium text-sm">Actividad hecha con:</span>
              {selectedMembers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedMembers.length}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
            {members.map((member) => (
              <div
                key={member.username}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded transition-colors"
              >
                <Checkbox
                  id={`member-${member.username}`}
                  checked={selectedMembers.includes(member.username)}
                  onCheckedChange={(checked) => handleCheckboxChange(member.username, checked as boolean)}
                />
                <Label htmlFor={`member-${member.username}`} className="flex-1 cursor-pointer font-normal">
                  {member.username}
                </Label>
              </div>
            ))}
          </div>

          {selectedMembers.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium">Los miembros etiquetados recibirán una notificación</p>
                  <p className="mt-1">Podrán aceptar o rechazar la solicitud para registrar la misma actividad</p>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
