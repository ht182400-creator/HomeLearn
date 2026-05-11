'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  getSpeechTypeOptions,
  getScoreLevel,
  formatEvaluationResult,
  EvaluationResult,
  EvaluationStatus,
  sampleSentences,
  sampleParagraphs,
  freeSpeakTopics,
} from '@/lib/validators/speech'
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  Star,
  MessageSquare,
  BookOpen,
  Lightbulb,
} from 'lucide-react'

export default function SpeechPage() {
  const [speechType, setSpeechType] = useState<string>('read_sentence')
  const [referenceText, setReferenceText] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [status, setStatus] = useState<EvaluationStatus>('pending')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 根据类型加载示例文本
  useEffect(() => {
    if (speechType === 'read_sentence') {
      setReferenceText(sampleSentences[0].text)
    } else if (speechType === 'read_paragraph') {
      setReferenceText(sampleParagraphs[0].text)
    } else {
      setReferenceText(freeSpeakTopics[0])
    }
  }, [speechType])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStatus('recording')
      setRecordingTime(0)
      setResult(null)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatus('pending')
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // 播放录音
  const playRecording = () => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // 停止播放
  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  // 提交评测
  const handleEvaluate = async () => {
    if (!audioBlob) {
      alert('请先录制音频')
      return
    }

    setIsProcessing(true)
    setStatus('processing')
    setResult(null)

    try {
      // 将 Blob 转换为 Base64
      const reader = new FileReader()
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          referenceText,
          type: speechType,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '评测失败')
      }

      setResult(data)
      setStatus('completed')
    } catch (error) {
      console.error('Evaluation error:', error)
      setStatus('failed')
      alert(error instanceof Error ? error.message : '评测失败，请稍后重试')
    } finally {
      setIsProcessing(false)
    }
  }

  // 重置
  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setResult(null)
    setRecordingTime(0)
    setStatus('pending')
    setIsPlaying(false)
  }

  // 随机换一个示例
  const changeSample = () => {
    if (speechType === 'read_sentence') {
      const random = sampleSentences[Math.floor(Math.random() * sampleSentences.length)]
      setReferenceText(random.text)
    } else if (speechType === 'read_paragraph') {
      const random = sampleParagraphs[Math.floor(Math.random() * sampleParagraphs.length)]
      setReferenceText(random.text)
    } else {
      const random = freeSpeakTopics[Math.floor(Math.random() * freeSpeakTopics.length)]
      setReferenceText(random.text)
    }
  }

  // 朗读参考文本（浏览器语音合成）
  const speakReference = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(referenceText)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }, [referenceText])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const speechTypeOptions = getSpeechTypeOptions()

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">语音评测</h1>
        <p className="text-muted-foreground mt-2">练习英语口语，AI 智能评测发音、流畅度和准确度</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：练习区域 */}
        <div className="space-y-6">
          {/* 评测类型选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                选择评测类型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {speechTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSpeechType(option.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      speechType === option.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 参考文本 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {speechType === 'free_speak' ? '主题' : '参考文本'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={changeSample}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    换一篇
                  </Button>
                  {speechType !== 'free_speak' && (
                    <Button variant="outline" size="sm" onClick={speakReference}>
                      <Volume2 className="h-4 w-4 mr-1" />
                      听发音
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                {speechType === 'free_speak'
                  ? '根据以下主题自由表达，建议说 30-60 秒'
                  : '请朗读以下文本，注意发音和语调'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                className="min-h-[120px] text-lg leading-relaxed"
                placeholder="输入或选择要练习的文本..."
              />
            </CardContent>
          </Card>

          {/* 录音区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                录音练习
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 录音时间显示 */}
              <div className="text-center py-4">
                <div className={`text-4xl font-mono ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {formatTime(recordingTime)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {isRecording ? '录音中... 点击停止按钮结束' : '点击开始按钮进行录音'}
                </div>
              </div>

              {/* 录音波形指示 */}
              {isRecording && (
                <div className="flex justify-center gap-1">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 40 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16"
                    onClick={startRecording}
                    disabled={status === 'processing'}
                  >
                    <Mic className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-16 h-16"
                    onClick={stopRecording}
                  >
                    <Square className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* 播放和提交按钮 */}
              {audioUrl && !isRecording && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={isPlaying ? stopPlaying : playRecording}>
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          停止
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          播放
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      重录
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleEvaluate}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        评测中...
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        开始评测
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：评测结果 */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                评测结果
              </CardTitle>
              <CardDescription>AI 评测您的发音、流畅度和准确度</CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !isProcessing && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Mic className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">完成录音后点击"开始评测"查看结果</p>
                </div>
              )}

              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="font-medium">正在分析您的发音...</p>
                  <p className="text-sm text-muted-foreground mt-1">预计需要 2-3 秒</p>
                </div>
              )}

              {result && result.status === 'completed' && (
                <div className="space-y-6">
                  {/* 综合评分 */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4">
                      <div>
                        <div className="text-4xl font-bold">{result.overall}</div>
                        <div className="text-xs opacity-80">总分</div>
                      </div>
                    </div>
                    <div className={`text-xl font-medium ${getScoreLevel(result.overall!).color}`}>
                      {getScoreLevel(result.overall!).label} {getScoreLevel(result.overall!).emoji}
                    </div>
                  </div>

                  {/* 分项评分 */}
                  <div className="space-y-3">
                    <ScoreItem label="发音" score={result.pronunciation!} />
                    <ScoreItem label="流畅度" score={result.fluency!} />
                    <ScoreItem label="准确度" score={result.accuracy!} />
                  </div>

                  {/* 转写文本 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">转写文本</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {result.transcript || '无'}
                    </div>
                  </div>

                  {/* 改进建议 */}
                  {result.feedback && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">改进建议</Label>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        {result.feedback}
                      </div>
                    </div>
                  )}

                  {/* 再次练习 */}
                  <Button variant="outline" className="w-full" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    再次练习
                  </Button>
                </div>
              )}

              {result && result.status === 'failed' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-red-100 p-4 mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="font-medium text-red-600">评测失败</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.error || '请稍后重试'}</p>
                  <Button variant="outline" className="mt-4" onClick={handleReset}>
                    重新尝试
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 使用提示 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">使用提示</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>请在安静的环境中进行录音，避免背景噪音影响评测结果</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>录音时保持麦克风距离嘴部约 10-15 厘米，声音清晰即可</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>点击"听发音"可以先听标准发音，再进行跟读练习</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>评测结果仅供参考，持续练习才能不断提高口语水平</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// 评分项组件
function ScoreItem({ label, score }: { label: string; score: number }) {
  const level = getScoreLevel(score)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={`font-medium ${level.color}`}>
          {score}分 {level.emoji}
        </span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  )
}

// Label 组件
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
