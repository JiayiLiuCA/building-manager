import { CircleCheck, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { SURVEY_QUESTIONS } from '@/data/seed/constants'
import { responseAvg } from '@/data/selectors/satisfactionSelectors'
import { useAppStore } from '@/data/store'
import { useScopedData } from '@/hooks/useScopedData'
import type { Survey } from '@/data/types'
import { formatDateTime } from '@/lib/format'
import { surveyStatusMap } from '@/lib/statusMaps'

export function CompanySurveyPage() {
  const scoped = useScopedData()
  const companyId = scoped.currentUser?.companyId ?? ''

  const surveys = useMemo(
    () => [...scoped.surveys].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [scoped.surveys],
  )
  const myResponses = useMemo(
    () => scoped.surveyResponses.filter((r) => r.companyId === companyId),
    [scoped.surveyResponses, companyId],
  )

  const activeSurveys = surveys.filter((s) => s.status === 'active')
  const closedSurveys = surveys.filter((s) => s.status === 'closed')

  return (
    <div className="space-y-4">
      <PageHeader title="满意度调研" description="物业发起的制式满意度问卷;贵司的评分将实时计入园区满意度分析" />

      {activeSurveys.length === 0 && closedSurveys.length === 0 && (
        <EmptyState icon={ClipboardList} title="暂无调研" description="物业发起调研后会出现在这里" />
      )}

      {activeSurveys.map((survey) => (
        <ActiveSurveyCard
          key={survey.id}
          survey={survey}
          submitted={myResponses.some((r) => r.surveyId === survey.id)}
          submittedScores={myResponses.find((r) => r.surveyId === survey.id)?.scores}
        />
      ))}

      {closedSurveys.length > 0 && (
        <Card className="py-0">
          <CardHeader className="border-b py-3!">
            <CardTitle className="text-sm font-medium">历史调研</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {closedSurveys.map((survey) => {
              const mine = myResponses.find((r) => r.surveyId === survey.id)
              return (
                <div key={survey.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {survey.title}
                      <StatusBadge meta={surveyStatusMap[survey.status]} />
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{survey.periodLabel}</p>
                  </div>
                  {mine ? (
                    <div className="text-right text-xs text-muted-foreground">
                      <p>
                        我司综合评分{' '}
                        <span className="text-sm font-semibold text-foreground tabular-nums">{responseAvg(mine).toFixed(1)}</span> 分
                      </p>
                      <p className="mt-0.5 tabular-nums">提交于 {formatDateTime(mine.submittedAt)}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">未参与</span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ActiveSurveyCard({
  survey,
  submitted,
  submittedScores,
}: {
  survey: Survey
  submitted: boolean
  submittedScores?: Record<string, number>
}) {
  const submitSurveyResponse = useAppStore((s) => s.submitSurveyResponse)
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.key, 5])),
  )
  const [comment, setComment] = useState('')

  return (
    <Card className="border-blue-200/70 py-0">
      <CardHeader className="flex flex-row items-center gap-2 border-b py-3!">
        <ClipboardList className="size-4 text-blue-600" />
        <CardTitle className="text-sm font-medium">{survey.title}</CardTitle>
        <StatusBadge meta={surveyStatusMap[survey.status]} />
      </CardHeader>
      <CardContent className="p-4">
        {submitted ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CircleCheck className="size-4" /> 贵司已提交本期问卷,感谢参与!
            </p>
            {submittedScores && (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {SURVEY_QUESTIONS.map((q) => (
                  <div key={q.key} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{q.label}</span>
                    <StarRating value={submittedScores[q.key] ?? 0} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {SURVEY_QUESTIONS.map((q, i) => (
              <div key={q.key} className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  {i + 1}. {q.label}
                </p>
                <div className="flex items-center gap-2">
                  <StarRating
                    value={scores[q.key]}
                    onChange={(v) => setScores((prev) => ({ ...prev, [q.key]: v }))}
                  />
                  <span className="w-8 text-xs text-muted-foreground tabular-nums">{scores[q.key]} 分</span>
                </div>
              </div>
            ))}
            <Textarea
              rows={2}
              placeholder="其他意见与建议(选填)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                submitSurveyResponse({ surveyId: survey.id, scores, comment: comment.trim() || undefined })
                toast.success('问卷已提交,感谢贵司反馈!物业端满意度数据已实时更新')
              }}
            >
              提交问卷
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
