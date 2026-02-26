import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Lock, Star, Zap, Trophy, ChevronRight, Flame, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { modules, badges } from "@/data/learningContent";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface ProgressData {
  [lessonId: string]: { completed: boolean; quiz_score: number | null; xp_earned: number };
}

export default function Learning() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData>({});
  const [streak, setStreak] = useState(3);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          const map: ProgressData = {};
          data.forEach((row) => {
            map[row.lesson_id] = { completed: row.completed, quiz_score: row.quiz_score, xp_earned: row.xp_earned };
          });
          setProgress(map);
        }
      });
  }, [user]);

  const getModuleProgress = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return { completed: 0, total: 0, percent: 0 };
    const total = mod.lessons.length;
    const completed = mod.lessons.filter((l) => progress[l.id]?.completed).length;
    return { completed, total, percent: total > 0 ? (completed / total) * 100 : 0 };
  };

  const isModuleUnlocked = (mod: typeof modules[0]) => {
    if (!mod.unlockAfter) return true;
    const prev = getModuleProgress(mod.unlockAfter);
    return prev.percent === 100;
  };

  const totalXP = Object.values(progress).reduce((s, p) => s + p.xp_earned, 0);
  const totalCompleted = Object.values(progress).filter((p) => p.completed).length;
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedModules = modules.filter((m) => getModuleProgress(m.id).percent === 100).length;
  const earnedBadges = badges.filter((b) => {
    if (b.module) return getModuleProgress(b.module).percent === 100;
    return false;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold">Finance Academy</h1>
        <p className="text-muted-foreground mt-1">Master investing fundamentals · Earn XP · Build real skills</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: "Total XP", value: totalXP, color: "text-primary", bg: "bg-primary/10" },
          { icon: CheckCircle, label: "Lessons Done", value: `${totalCompleted}/${totalLessons}`, color: "text-gain", bg: "bg-gain/10" },
          { icon: Flame, label: "Day Streak", value: streak, color: "text-warning", bg: "bg-warning/10" },
          { icon: Trophy, label: "Badges", value: `${earnedBadges.length}/${badges.length}`, color: "text-primary", bg: "bg-primary/10" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={item} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress */}
      <motion.div variants={item} className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{completedModules}/{modules.length} modules complete</span>
        </div>
        <Progress value={(totalCompleted / totalLessons) * 100} className="h-2" />
      </motion.div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <motion.div variants={item} className="flex gap-3 overflow-x-auto pb-1">
          {earnedBadges.map((b) => (
            <div key={b.id} className="glass-card px-3 py-2 flex items-center gap-2 shrink-0">
              <span className="text-xl">{b.icon}</span>
              <span className="text-xs font-medium">{b.name}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Module Cards */}
      <div className="space-y-3">
        {modules.map((mod) => {
          const prog = getModuleProgress(mod.id);
          const unlocked = isModuleUnlocked(mod);
          return (
            <motion.div
              key={mod.id}
              variants={item}
              onClick={() => unlocked && navigate(`/learn/${mod.id}`)}
              className={`glass-card-hover p-5 cursor-pointer ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl shrink-0">{mod.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{mod.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${mod.level === "Beginner" ? "bg-gain/10 text-gain" : "bg-primary/10 text-primary"}`}>
                      {mod.level}
                    </span>
                    {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    {prog.percent === 100 && <CheckCircle className="w-4 h-4 text-gain" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{mod.subtitle}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={prog.percent} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {prog.completed}/{prog.total} lessons
                    </span>
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Star className="w-3 h-3" /> {mod.xpReward} XP
                    </span>
                  </div>
                </div>
                {unlocked && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
