import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle, Clock, ChevronRight, Trophy, Zap, Target, MessageCircle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { modules, type ExplainMode, explainModeLabels, type LearningModule } from "@/data/learningContent";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mod = modules.find((m) => m.id === moduleId);

  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [explainMode, setExplainMode] = useState<ExplainMode>("beginner");
  const [quizActive, setQuizActive] = useState(false);
  const [quizQ, setQuizQ] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!user || !mod) return;
    supabase
      .from("learning_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setCompletedLessons(new Set(data.filter((r) => r.completed).map((r) => r.lesson_id)));
        }
      });
  }, [user, mod]);

  if (!mod) return <div className="text-center py-12 text-muted-foreground">Module not found</div>;

  const completedCount = mod.lessons.filter((l) => completedLessons.has(l.id)).length;
  const progressPercent = (completedCount / mod.lessons.length) * 100;
  const lesson = mod.lessons.find((l) => l.id === activeLesson);

  const markComplete = async (lessonId: string) => {
    if (!user) return;
    const xp = Math.round(mod.xpReward / mod.lessons.length);
    const { error } = await supabase.from("learning_progress").upsert(
      { user_id: user.id, lesson_id: lessonId, completed: true, xp_earned: xp },
      { onConflict: "user_id,lesson_id" }
    );
    if (!error) {
      setCompletedLessons((prev) => new Set([...prev, lessonId]));
      toast.success(`+${xp} XP earned!`);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(idx);
    const correct = idx === mod.quiz[quizQ].correctIndex;
    if (correct) setQuizScore((s) => s + 1);
    setTimeout(() => {
      if (quizQ < mod.quiz.length - 1) {
        setQuizQ((q) => q + 1);
        setQuizAnswered(null);
      } else {
        setQuizComplete(true);
        if (user) {
          supabase.from("learning_progress").upsert(
            { user_id: user.id, lesson_id: `${mod.id}-quiz`, completed: true, quiz_score: quizScore + (correct ? 1 : 0), xp_earned: (quizScore + (correct ? 1 : 0)) * 20 },
            { onConflict: "user_id,lesson_id" }
          );
        }
      }
    }, 1200);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const context = lesson
        ? `The student is studying "${lesson.title}" in module "${mod.title}". Lesson content: ${lesson.content[explainMode]}`
        : `The student is browsing module "${mod.title}": ${mod.overview}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a friendly finance tutor for Indian Gen-Z investors. Keep answers short (under 150 words), use simple language, and relate to Indian markets. Context: ${context}` },
            ...chatMessages.slice(-6),
            userMsg,
          ],
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistant } : m);
                return [...prev, { role: "assistant", content: assistant }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Try again!" }]);
    }
    setChatLoading(false);
  };

  // Quiz View
  if (quizActive) {
    const q = mod.quiz[quizQ];
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={item} className="flex items-center gap-3">
          <button onClick={() => { setQuizActive(false); setQuizQ(0); setQuizScore(0); setQuizAnswered(null); setQuizComplete(false); }} className="p-2 rounded-lg hover:bg-secondary/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">{mod.title} — Quiz</h2>
        </motion.div>

        {!quizComplete ? (
          <motion.div variants={item} className="glass-card p-6">
            <div className="flex justify-between mb-4">
              <span className="text-sm text-muted-foreground">Q {quizQ + 1}/{mod.quiz.length}</span>
              <span className="text-sm font-mono text-primary">Score: {quizScore}</span>
            </div>
            <h3 className="text-lg font-semibold mb-5">{q.question}</h3>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = quizAnswered === i;
                return (
                  <button key={i} onClick={() => handleQuizAnswer(i)} className={`w-full text-left p-4 rounded-lg border transition-all ${
                    quizAnswered !== null
                      ? isCorrect ? "border-gain bg-gain/10 text-gain" : isSelected ? "border-loss bg-loss/10 text-loss" : "border-border/50 text-muted-foreground"
                      : "border-border hover:border-primary/30 hover:bg-primary/5"
                  }`}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {quizAnswered !== null && (
              <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                💡 {q.explanation}
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div variants={item} className="glass-card p-8 text-center">
            <Trophy className="w-12 h-12 text-warning mx-auto mb-3" />
            <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
            <p className="text-xl mb-1">Score: {quizScore}/{mod.quiz.length}</p>
            <p className="text-primary flex items-center justify-center gap-1 mb-6"><Zap className="w-4 h-4" /> +{quizScore * 20} XP</p>
            {quizScore === mod.quiz.length && <p className="text-gain mb-4">🎯 Perfect score! Badge: Quiz Ace unlocked!</p>}
            <Button onClick={() => { setQuizActive(false); setQuizQ(0); setQuizScore(0); setQuizAnswered(null); setQuizComplete(false); }} variant="secondary">
              Back to Module
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Lesson View
  if (lesson) {
    const lessonIdx = mod.lessons.findIndex((l) => l.id === lesson.id);
    const nextLesson = mod.lessons[lessonIdx + 1];
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={item} className="flex items-center gap-3">
          <button onClick={() => setActiveLesson(null)} className="p-2 rounded-lg hover:bg-secondary/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{mod.title}</p>
            <h2 className="text-xl font-bold">{lesson.title}</h2>
          </div>
        </motion.div>

        {/* Explain Mode Toggle */}
        <motion.div variants={item} className="flex gap-2 flex-wrap">
          {(Object.entries(explainModeLabels) as [ExplainMode, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setExplainMode(key)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${explainMode === key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}>
              {label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div variants={item} className="glass-card p-6 space-y-5">
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="text-foreground leading-relaxed">{lesson.content[explainMode]}</p>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4 border border-border/30">
            <h4 className="text-sm font-semibold text-primary mb-2">📌 Real-World Example (India)</h4>
            <p className="text-sm text-muted-foreground">{lesson.example}</p>
          </div>

          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <h4 className="text-sm font-semibold text-primary mb-2">🤔 Think About This</h4>
            <p className="text-sm text-muted-foreground">{lesson.interactivePrompt}</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
          {!completedLessons.has(lesson.id) ? (
            <Button onClick={() => markComplete(lesson.id)} className="gap-2">
              <CheckCircle className="w-4 h-4" /> Mark Complete
            </Button>
          ) : (
            <span className="text-sm text-gain flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Completed</span>
          )}
          {nextLesson && (
            <Button variant="secondary" onClick={() => setActiveLesson(nextLesson.id)} className="gap-2">
              Next Lesson <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {!nextLesson && (
            <Button variant="secondary" onClick={() => setActiveLesson(null)} className="gap-2">
              Back to Module
            </Button>
          )}
        </motion.div>

        {/* Prediction Unlock */}
        {mod.predictionUnlock && lessonIdx >= 1 && (
          <motion.div variants={item} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Ready to test your knowledge?</span>
            </div>
            <Button size="sm" onClick={() => navigate("/predictions")}>Try Predicting a Stock →</Button>
          </motion.div>
        )}

        {/* Chat Assistant FAB */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-20 right-4 w-80 sm:w-96 glass-card border border-border/50 rounded-2xl overflow-hidden z-50 flex flex-col" style={{ maxHeight: "60vh" }}>
              <div className="p-3 border-b border-border/30 flex items-center justify-between">
                <span className="text-sm font-semibold">🤖 Study Assistant</span>
                <button onClick={() => setChatOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 120 }}>
                {chatMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ask any doubt about this lesson!</p>}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`text-sm p-2 rounded-lg ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-secondary/50 mr-8"}`}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border/30 flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask a doubt..." className="flex-1 bg-secondary/30 rounded-lg px-3 py-2 text-sm outline-none border border-border/30 focus:border-primary/50" />
                <Button size="sm" onClick={sendChat} disabled={chatLoading}>Send</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-50">
          <MessageCircle className="w-5 h-5" />
        </button>
      </motion.div>
    );
  }

  // Module Overview
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center gap-3">
        <button onClick={() => navigate("/learn")} className="p-2 rounded-lg hover:bg-secondary/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{mod.icon}</span>
            <h1 className="text-2xl font-bold">{mod.title}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{mod.subtitle}</p>
        </div>
      </motion.div>

      {/* Progress + badge */}
      <motion.div variants={item} className="glass-card p-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{mod.lessons.length} lessons</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        <div className="text-center shrink-0">
          <span className="text-3xl">{mod.badge.icon}</span>
          <p className="text-xs text-muted-foreground mt-1">{mod.badge.name}</p>
        </div>
      </motion.div>

      {/* Overview */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Overview</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{mod.overview}</p>
      </motion.div>

      {/* Lessons */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lessons</h3>
        {mod.lessons.map((lesson, idx) => {
          const done = completedLessons.has(lesson.id);
          return (
            <motion.div key={lesson.id} variants={item} onClick={() => setActiveLesson(lesson.id)}
              className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? "bg-gain/20 text-gain" : "bg-secondary text-muted-foreground"}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{lesson.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {lesson.duration}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          );
        })}
      </div>

      {/* Quiz CTA */}
      <motion.div variants={item} className="glass-card p-5 text-center">
        <Target className="w-8 h-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold mb-1">Module Quiz</h3>
        <p className="text-sm text-muted-foreground mb-4">{mod.quiz.length} questions · Earn up to {mod.quiz.length * 20} XP</p>
        <Button onClick={() => { setQuizActive(true); setQuizQ(0); setQuizScore(0); setQuizAnswered(null); setQuizComplete(false); }}>
          Start Quiz
        </Button>
      </motion.div>

      {/* Prediction link */}
      {mod.predictionUnlock && (
        <motion.div variants={item} className="glass-card p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">🎯 Prediction Playground Unlocked!</h3>
            <p className="text-xs text-muted-foreground mt-1">Apply what you learned — predict stock movements</p>
          </div>
          <Button size="sm" onClick={() => navigate("/predictions")}>Try Now →</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
