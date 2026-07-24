"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle, Send, Trash2 } from "lucide-react"
import UserAvatar from "@/components/user-avatar"
import { useApp } from "@/app/app-provider"
import { timeAgo } from "@/lib/date-utils"
import {
  addPostComment,
  deletePostComment,
  getPostComments,
  togglePostReaction,
  type InteractivePostType,
  type PostComment,
  type PostInteractions,
} from "@/lib/actions"

/**
 * Paleta fija de reacciones. Se muestran todas siempre (son pocas y entran en
 * una fila scrolleable en mobile), así no hace falta un picker aparte.
 */
export const REACTIONS: { emoji: string; label: string }[] = [
  { emoji: "🐂", label: "Toro" },
  { emoji: "🔥", label: "Fuego" },
  { emoji: "❤️", label: "Corazón" },
  { emoji: "💀", label: "Calavera" },
  { emoji: "🥷", label: "Ladrón" },
  { emoji: "💪", label: "Fuerza" },
  { emoji: "😂", label: "Risa" },
  { emoji: "🐐", label: "GOAT" },
]

type Props = {
  postType: InteractivePostType
  postId: string
  initial?: PostInteractions
}

export default function PostInteractions({ postType, postId, initial }: Props) {
  const { username } = useApp()

  const [counts, setCounts] = useState<Record<string, number>>(initial?.counts ?? {})
  const [mine, setMine] = useState<string[]>(initial?.mine ?? [])
  const [commentCount, setCommentCount] = useState(initial?.commentCount ?? 0)

  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<PostComment[] | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // El feed puede recargar la página de interacciones después de montar.
  useEffect(() => {
    if (!initial) return
    setCounts(initial.counts)
    setMine(initial.mine)
    setCommentCount(initial.commentCount)
  }, [initial])

  async function toggle(emoji: string) {
    if (!username) return
    const had = mine.includes(emoji)

    // Optimista: la reacción tiene que sentirse instantánea.
    setMine((prev) => (had ? prev.filter((e) => e !== emoji) : [...prev, emoji]))
    setCounts((prev) => {
      const next = { ...prev }
      next[emoji] = Math.max(0, (next[emoji] ?? 0) + (had ? -1 : 1))
      if (next[emoji] === 0) delete next[emoji]
      return next
    })

    const res = await togglePostReaction({ postType, postId, username, emoji })
    if (!res.success) {
      // Revertimos si falló.
      setMine((prev) => (had ? [...prev, emoji] : prev.filter((e) => e !== emoji)))
      setCounts((prev) => {
        const next = { ...prev }
        next[emoji] = Math.max(0, (next[emoji] ?? 0) + (had ? 1 : -1))
        if (next[emoji] === 0) delete next[emoji]
        return next
      })
    }
  }

  async function openComments() {
    const next = !open
    setOpen(next)
    if (!next || comments !== null) return
    setLoadingComments(true)
    const res = await getPostComments(postType, postId)
    setComments(res.comments)
    setCommentCount(res.comments.length)
    setLoadingComments(false)
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
    setComments((prev) => [...(prev ?? []), created])
    setCommentCount((c) => c + 1)
    inputRef.current?.focus()
  }

  async function remove(id: string) {
    if (!username) return
    const prev = comments ?? []
    setComments(prev.filter((c) => c.id !== id))
    setCommentCount((c) => Math.max(0, c - 1))
    const res = await deletePostComment(id, username)
    if (!res.success) {
      setComments(prev)
      setCommentCount(prev.length)
    }
  }

  return (
    <div className="border-t border-black/5">
      {/* Barra de reacciones */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
        {REACTIONS.map(({ emoji, label }) => {
          const count = counts[emoji] ?? 0
          const active = mine.includes(emoji)
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggle(emoji)}
              disabled={!username}
              aria-label={`Reaccionar con ${label}`}
              aria-pressed={active}
              className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-sm transition active:scale-90 border ${
                active
                  ? "bg-toro-primary/15 border-toro-primary/40"
                  : "bg-toro-background/60 border-transparent hover:bg-toro-background"
              }`}
            >
              <span className="leading-none">{emoji}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold leading-none ${
                    active ? "text-toro-primary" : "text-toro-foreground/50"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={openComments}
          className="shrink-0 ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-toro-foreground/60 hover:bg-toro-background transition active:scale-90"
          aria-label="Comentarios"
          aria-expanded={open}
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 && <span className="text-[11px] font-bold leading-none">{commentCount}</span>}
        </button>
      </div>

      {/* Comentarios */}
      {open && (
        <div className="px-3 pb-3 border-t border-black/5 pt-2 space-y-2.5">
          {loadingComments ? (
            <p className="text-xs text-toro-foreground/40 py-2">Cargando comentarios…</p>
          ) : (comments ?? []).length === 0 ? (
            <p className="text-xs text-toro-foreground/40 py-1">Todavía no hay comentarios. Estrenalo vos.</p>
          ) : (
            (comments ?? []).map((c) => (
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

          {username && (
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
