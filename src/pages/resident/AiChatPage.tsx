import { Bot, Phone, SendHorizonal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AiBadge } from '@/components/shared/AiBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SERVICE_PHONE } from '@/data/constants'
import { useAppStore } from '@/data/store'
import type { ChatMessage } from '@/data/types'
import { cn } from '@/lib/utils'

const QUICK_QUESTIONS = ['物业费怎么收?', '我现在欠费多少?', '我的报修进度', '怎么缴费?', '装修要办什么手续?']

export function AiChatPage() {
  const messages = useAppStore((s) => s.chatMessages)
  const sendChatMessage = useAppStore((s) => s.sendChatMessage)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    sendChatMessage(t)
    setInput('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            我的咨询 <AiBadge />
          </h1>
          <p className="text-xs text-muted-foreground">
            AI 助手实时解答物业问题;人工服务请拨打客服热线 {SERVICE_PHONE}
          </p>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="flex h-[480px] flex-col p-0">
          {/* 消息区 */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 快捷提问 */}
          <div className="flex gap-2 overflow-x-auto border-t px-3 py-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="shrink-0 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* 输入区 */}
          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <Input
              placeholder="输入您的问题,如:物业费怎么收?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <SendHorizonal />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone className="size-3.5" />
        电话咨询:{SERVICE_PHONE}(8:30-18:00),紧急报修 24 小时受理
      </p>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAi = message.role === 'ai'
  return (
    <div className={cn('flex gap-2', isAi ? 'justify-start' : 'justify-end')}>
      {isAi && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <Bot className="size-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isAi ? 'rounded-tl-sm bg-muted text-foreground' : 'rounded-tr-sm bg-primary text-primary-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
