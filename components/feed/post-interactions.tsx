"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle, Send, SmilePlus, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import UserAvatar from "@/components/user-avatar"
import { useApp } from "@/app/app-provider"
import { timeAgo } from "@/lib/date-utils"
import {
  addPostComment,
  deletePostComment,
  getPostComments,
  setPostReaction,
  type InteractivePostType,
  type PostComment,
  type PostInteractions,
} from "@/lib/actions"

/** Paleta de reacciones que ofrece el popover. Una sola por persona por post. */
export const REACTIONS: { emoji: string; label: string }[] = [
  { emoji: "🐂", label: "Toro" },
  { emoji: "🔥", label: "Fuego" },
  { emoji: "❤️", label: "Corazón" },
  { emoji: "💀", label: "Calavera" },
  { emoji: "🥷", label: "Ladrón" },
  { emoji: "💪", label: "Fuerza" },
  { emoji: "😂", label: "Risa" },
  { emoji: "🐐", label: "GOAT" },
  { emoji: "👏", label: "Aplausos" },
  { emoji: "🤯", label: "Cabeza explotada" },
]

type Props = {
  postType: InteractivePostType
  postId: string
  initial?: PostInteractions
}

export default function PostInteractions({ postType, postId, initial }: Props) {
  const { username } = useApp()

  const [counts, setCounts] = useState<Record<string, number>>(initial?.counts ?? {})
  const [mine, setMine] = useState<string | null>(initial?.mine ?? null)
  const [commentCount, setCommentCount] = useState(initial?.commentCount ?? 0)
  const [preview, setPreview] = useState<PostComment[]>(initial?.preview ?? [])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [allComments, setAllComments] = useState<PostComment[] | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // El feed precarga las interacciones después de montar la lista.
  useEffect(() => {
    if (!initial) return
    setCounts(initial.counts)
    setMine(initial.mine)
    setCommentCount(initial.commentCount)
    setPreview(initial.preview)
  }, [initial])

  /** Una sola reacción por persona: el mismo emoji la saca, otro la reemplaza. */
  async function react(emoji: string) {
    if (!username) return
    setPickerOpen(false)

    const prevMine = mine
    const nextMine = prevMine === emoji ? null : emoji

    // Optimista: tiene que sentirse instantáneo.
    setMine(nextMine)
    setCounts((prev) => {
      const next = { ...prev }
      if (prevMine) {
        next[prevMine] = (next[prevMine] ?? 1) - 1
        if (next[prevMine] <= 0) delete next[prevMine]
      }
      if (nextMine) next[nextMine] = (next[nextMine] ?? 0) + 1
      return next
    })

    const res = await setPostReaction({ postType, postId, username, emoji })
    if (!res.success) {
      // Revertimos si falló.
      setMine(prevMine)
      setCounts((prev) => {
        const next = { ...prev }
        if (nextMine) {
          next[nextMine] = (next[nextMine] ?? 1) - 1
          if (next[nextMine] <= 0) delete next[nextMine]
        }
        if (prevMine) next[prevMine] = (next[prevMine] ?? 0) + 1
        return next
      })
    }
  }

  async function loadAll() {
    if (allComments !== null) return
    setLoadingComments(true)
    const res = await getPostComments(postType, postId)
    setAllComments(res.comments)
    setCommentCount(res.comments.length)
    setPreview(res.comments.slice(-2))
    setLoadingComments(false)
  }

  async function toggleComments() {
    const next = !expanded
    setExpanded(next)
    if (next) await loadAll()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || sending) return
    const body = draft.trim()
    if (!body) return

    setSending(true)
    const res = await addPostComment({ postType, postId, username, body })
    setSending(false)
    const created = (res as { comment?: PostComment }).comment
    if (!res.success || !created) return

    setDraft("")
    setAllComments((prev) => [...(prev ?? []), created])
    setPreview((prev) => [...prev, created].slice(-2))
    setCommentCount((c) => c + 1)
    inputRef.current?.focus()
  }

  async function remove(id: string) {
    if (!username) return
    const prevAll = allComments ?? []
    const prevPreview = preview
    const nextAll = prevAll.filter((c) => c.id !== id)

    setAllComments(nextAll)
    setPreview(nextAll.slice(-2))
    setCommentCount((c) => Math.max(0, c - 1))

    const res = await deletePostComment(id, username)
    if (!res.success) {
      setAllComments(prevAll)
      setPreview(prevPreview)
      setCommentCount(prevAll.length)
    }
  }

  // Emojis con al menos una reacción, del más votado al menos.
  const summary = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])

  const shown = expanded ? allComments ?? [] : preview
  const hiddenCount = commentCount - preview.length

  return (
    <div className="border-t border-black/5">
      {/* Resumen de reacciones + los dos botones */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!username}
              aria-label="Dejar una reacción"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-95 border ${
                mine
                  ? "bg-toro-primary/15 border-toro-primary/40 text-toro-primary"
                  : "bg-toro-background/60 border-transparent text-toro-foreground/60 hover:bg-toro-background"
              }`}
            >
              {mine ? <span className="text-base leading-none">{mine}</span> : <SmilePlus className="w-4 h-4" />}
              <span>{mine ? "Reaccionaste" : "Reaccionar"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-auto max-w-[min(20rem,90vw)] p-2 rounded-2xl">
            <div className="flex flex-wrap gap-1 justify-center">
              {REACTIONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  aria-label={label}
                  title={label}
                  className={`w-9 h-9 rounded-full text-xl leading-none flex items-center justify-center transition hover:scale-125 active:scale-95 ${
                    mine === emoji ? "bg-toro-primary/15 ring-1 ring-toro-primary/40" : "hover:bg-toro-background"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={toggleComments}
          aria-label="Comentarios"
          aria-expanded={expanded}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-toro-foreground/60 bg-toro-background/60 hover:bg-toro-background transition active:scale-95"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount}</span>
        </button>

        {/* Cuántas reacciones tiene de cada emoji */}
        {summary.length > 0 && (
          <div className="flex items-center gap-1 ml-auto overflow-x-auto no-scrollbar">
            {summary.map(([emoji, n]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                disabled={!username}
                aria-label={`${n} ${emoji}`}
                className={`shrink-0 flex items-center gap-0.5 rounded-full px-2 py-1 text-sm transition active:scale-90 border ${
                  mine === emoji ? "bg-toro-primary/15 border-toro-primary/40" : "bg-toro-background/60 border-transparent"
                }`}
              >
                <span className="leading-none">{emoji}</span>
                <span
                  className={`text-[11px] font-bold leading-none ${
                    mine === emoji ? "text-toro-primary" : "text-toro-foreground/50"
                  }`}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comentarios: preview de hasta 2, o la lista completa si está expandido */}
      {(shown.length > 0 || expanded) && (
        <div className="px-3 pb-2 space-y-2">
          {loadingComments && shown.length === 0 ? (
            <p className="text-xs text-toro-foreground/40 py-1">Cargando comentarios…</p>
          ) : shown.length === 0 ? (
            <p className="text-xs text-toro-foreground/40 py-1">Todavía no hay comentarios. Estrenalo vos.</p>
          ) : (
            shown.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Link href={`/profile/${c.username}`} className="shrink-0 mt-0.5">
                  <UserAvatar avatarId={c.avatar || "default"} username={c.username} size="sm" />
                </Link>
                <div className="min-w-0 flex-1 rounded-2xl bg-toro-background/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/profile/${c.username}`}
                      className="text-xs font-bold text-toro-foreground hover:underline"
                    >
                      {c.username}
                    </Link>
                    <span className="text-[10px] text-toro-foreground/40">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-toro-foreground/90 break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {username === c.username && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="Borrar comentario"
                    className="shrink-0 mt-1 text-toro-foreground/30 hover:text-toro-primary transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}

          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={toggleComments}
              className="text-xs font-semibold text-toro-foreground/50 hover:text-toro-primary transition"
            >
              Ver {hiddenCount === 1 ? "1 comentario más" : `los ${commentCount} comentarios`}
            </button>
          )}

          {expanded && username && (
            <form onSubmit={submit} className="flex items-center gap-2 pt-1">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder="Escribí un comentario…"
                className="flex-1 min-w-0 rounded-full bg-toro-background/70 border border-black/5 px-3 py-2 text-sm outline-none focus:border-toro-primary/40"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Enviar comentario"
                className="shrink-0 w-9 h-9 rounded-full bg-toro-primary text-white flex items-center justify-center disabled:opacity-40 transition active:scale-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
