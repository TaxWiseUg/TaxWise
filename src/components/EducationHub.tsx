import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C, levelColors } from "../lib/constants";
import { Badge, Button, Card } from "./UI";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
}

interface Course {
  id: number;
  title: string;
  level: "Beginner" | "Intermediate" | "Professional";
  emoji: string;
  color: string;
  accent_color: string;
  description: string;
  lessons: Lesson[];
}

interface Enrollment {
  id: string;
  course_id: number;
  progress: number;
  completed_lessons: string[];
}

interface EducationHubProps {
  user: {
    id: string;
  };
}

export const EducationHub: React.FC<EducationHubProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment>>({});
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI Tutor state
  const [aiQ, setAiQ] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("id", { ascending: true });

      if (coursesError) throw coursesError;

      // Fetch user's enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id);

      if (enrollmentsError) throw enrollmentsError;

      if (coursesData) setCourses(coursesData as Course[]);
      
      const enrollMap: Record<number, Enrollment> = {};
      if (enrollmentsData) {
        enrollmentsData.forEach((e) => {
          enrollMap[e.course_id] = e as Enrollment;
        });
      }
      setEnrollments(enrollMap);
    } catch (err) {
      console.error("Error loading education hub data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const startOrLoadCourse = async (course: Course) => {
    setActiveCourse(course);
    setActiveLesson(null);
    setAiQ("");
    setAiAnswer("");

    // If not enrolled, create enrollment
    if (!enrollments[course.id]) {
      try {
        const { data: newEnrollment, error } = await supabase
          .from("enrollments")
          .insert({
            user_id: user.id,
            course_id: course.id,
            progress: 0,
            completed_lessons: [],
          })
          .select()
          .single();

        if (error) throw error;
        
        if (newEnrollment) {
          setEnrollments((prev) => ({
            ...prev,
            [course.id]: newEnrollment as Enrollment,
          }));
        }
      } catch (err) {
        console.error("Failed to enroll user in course:", err);
      }
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!activeCourse) return;
    const currentEnrollment = enrollments[activeCourse.id];
    if (!currentEnrollment) return;

    // Check if already completed
    if (currentEnrollment.completed_lessons.includes(lessonId)) {
      setActiveLesson(null);
      return;
    }

    const updatedCompleted = [...currentEnrollment.completed_lessons, lessonId];
    const calculatedProgress = Math.round((updatedCompleted.length / activeCourse.lessons.length) * 100);

    try {
      const { error } = await supabase
        .from("enrollments")
        .update({
          completed_lessons: updatedCompleted,
          progress: calculatedProgress,
          completed_at: calculatedProgress === 100 ? new Date().toISOString() : null,
        })
        .eq("id", currentEnrollment.id);

      if (error) throw error;

      // Update local state
      setEnrollments((prev) => ({
        ...prev,
        [activeCourse.id]: {
          ...prev[activeCourse.id],
          completed_lessons: updatedCompleted,
          progress: calculatedProgress,
        },
      }));
      
      setActiveLesson(null);
    } catch (err) {
      console.error("Failed to save lesson completion:", err);
    }
  };

  const askAI = async () => {
    if (!aiQ.trim() || !activeCourse) return;
    setAiLoading(true);
    setAiAnswer("");
    
    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: activeCourse.title,
          lessonTitle: activeLesson?.title || "Course Overview",
          question: aiQ,
        }),
      });

      if (!res.ok) throw new Error("AI tutor endpoint failed");
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setAiAnswer(data.answer);
    } catch (err: any) {
      console.error("AI Tutor call error:", err);
      setAiAnswer("Tutor is currently offline. Please check that you have added your Anthropic API Key in `.env.local`.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
        <div style={{ fontSize: "1.8rem", animation: "spin 1s linear infinite", marginBottom: 10 }}>⟳</div>
        <div>Loading courses...</div>
      </div>
    );
  }

  // Active Lesson view
  if (activeLesson && activeCourse) {
    const enrollment = enrollments[activeCourse.id];
    const isCompleted = enrollment?.completed_lessons.includes(activeLesson.id);
    const [lColor] = levelColors[activeCourse.level] || [C.teal, C.tealLight];

    return (
      <div>
        <button
          onClick={() => {
            setActiveLesson(null);
            setAiQ("");
            setAiAnswer("");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.teal,
            fontWeight: 700,
            fontSize: "0.875rem",
            marginBottom: 20,
            padding: 0,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to {activeCourse.title}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px, 320px)", gap: 24 }}>
          <Card style={{ padding: 32 }}>
            <Badge color={lColor} bg={levelColors[activeCourse.level]?.[1] || C.tealLight}>
              {activeCourse.level}
            </Badge>
            <h2 style={{ fontFamily: "Georgia, serif", color: C.navy, fontSize: "1.4rem", margin: "12px 0 6px" }}>
              {activeLesson.title}
            </h2>
            <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 24 }}>
              ⏱ {activeLesson.duration} · {activeCourse.title}
            </div>
            
            <div style={{ fontSize: "0.9rem", color: C.text, lineHeight: 1.85, whiteSpace: "pre-line" }}>
              {activeLesson.content.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
              <Button onClick={() => markLessonComplete(activeLesson.id)} disabled={isCompleted}>
                {isCompleted ? "✓ Completed" : "Mark as Complete ✓"}
              </Button>
              <Button variant="outline" onClick={() => { setActiveLesson(null); setAiQ(""); setAiAnswer(""); }}>
                Back to Lessons
              </Button>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12, fontSize: "0.9rem" }}>
                Course Progress
              </div>
              {activeCourse.lessons.map((l, i) => {
                const lessonDone = enrollment?.completed_lessons.includes(l.id);
                const isCurrent = l.id === activeLesson.id;

                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      setActiveLesson(l);
                      setAiQ("");
                      setAiAnswer("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: i < activeCourse.lessons.length - 1 ? `1px solid ${C.border}` : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: lessonDone ? C.teal : isCurrent ? C.navy : C.offwhite,
                        border: `2px solid ${lessonDone ? C.teal : isCurrent ? C.navy : C.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        color: lessonDone || isCurrent ? C.white : C.muted,
                        flexShrink: 0,
                      }}
                    >
                      {lessonDone ? "✓" : i + 1}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: isCurrent ? C.navy : C.text,
                        fontWeight: isCurrent ? 700 : 400,
                        flex: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {l.title}
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10, fontSize: "0.9rem" }}>
                ✦ Ask the AI Tutor
              </div>
              <textarea
                value={aiQ}
                onChange={(e) => setAiQ(e.target.value)}
                placeholder="Ask a question about this lesson..."
                style={{
                  width: "100%",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  resize: "none",
                  minHeight: 80,
                  outline: "none",
                  boxSizing: "border-box",
                  background: C.offwhite,
                  color: C.text,
                }}
              />
              <Button onClick={askAI} disabled={aiLoading || !aiQ.trim()} small style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                {aiLoading ? "⟳ Thinking..." : "Get Answer →"}
              </Button>
              {aiAnswer && (
                <div
                  style={{
                    marginTop: 12,
                    background: C.tealLight,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: "0.82rem",
                    color: C.text,
                    lineHeight: 1.7,
                  }}
                >
                  {aiAnswer}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Course Overview view
  if (activeCourse) {
    const enrollment = enrollments[activeCourse.id];
    const completedCount = enrollment?.completed_lessons.length || 0;
    const progressPercent = enrollment?.progress || 0;
    const [lColor, lBg] = levelColors[activeCourse.level] || [C.teal, C.tealLight];

    return (
      <div>
        <button
          onClick={() => setActiveCourse(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.teal,
            fontWeight: 700,
            fontSize: "0.875rem",
            marginBottom: 20,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          ← All Courses
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px, 300px)", gap: 24 }}>
          <div>
            <div style={{ background: lBg, borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{activeCourse.emoji}</div>
              <Badge color={lColor} bg={C.white}>
                {activeCourse.level}
              </Badge>
              <h1 style={{ fontFamily: "Georgia, serif", color: C.navy, fontSize: "1.5rem", margin: "10px 0 8px" }}>
                {activeCourse.title}
              </h1>
              <p style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.7 }}>{activeCourse.description}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCourse.lessons.map((l, i) => {
                const lessonDone = enrollment?.completed_lessons.includes(l.id);
                return (
                  <Card
                    key={l.id}
                    hover
                    style={{ padding: "16px 20px", cursor: "pointer" }}
                    onClick={() => setActiveLesson(l)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: lessonDone ? C.teal : C.offwhite,
                          border: `2px solid ${lessonDone ? C.teal : C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          color: lessonDone ? C.white : C.muted,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {lessonDone ? "✓" : i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.9rem" }}>{l.title}</div>
                        <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>⏱ {l.duration}</div>
                      </div>
                      <span style={{ color: C.teal, fontSize: "1rem" }}>→</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>Your Progress</div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${C.teal}, ${C.gold})`,
                    borderRadius: 4,
                    transition: "width .3s",
                  }}
                />
              </div>
              <div style={{ fontSize: "0.8rem", color: C.muted }}>
                {completedCount} of {activeCourse.lessons.length} lessons done ({progressPercent}%)
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>
        Learning Hub
      </h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>
        Structured Uganda tax education — from fundamentals to TAT appeals mastery.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {courses.map((c) => {
          const enrollment = enrollments[c.id];
          const done = enrollment?.completed_lessons.length || 0;
          const progressPercent = enrollment?.progress || 0;
          const [lColor, lBg] = levelColors[c.level] || [C.teal, C.tealLight];

          return (
            <Card key={c.id} hover style={{ cursor: "pointer", overflow: "hidden" }} onClick={() => startOrLoadCourse(c)}>
              <div
                style={{
                  height: 110,
                  background: lBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.8rem",
                }}
              >
                {c.emoji}
              </div>
              <div style={{ padding: 20 }}>
                <Badge color={lColor} bg={lBg}>
                  {c.level}
                </Badge>
                <h3 style={{ fontFamily: "Georgia, serif", color: C.navy, margin: "10px 0 6px", fontSize: "1rem" }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>
                  {c.description}
                </p>
                <div style={{ height: 6, background: C.border, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      background: C.teal,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  padding: "12px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: C.muted }}>
                  {c.lessons.length} lessons · {c.title.includes("Appeals") ? "4 hrs" : c.title.includes("eFRIS") ? "2.5 hrs" : "3 hrs"}
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.teal }}>
                  {progressPercent > 0 ? `Continue (${progressPercent}%) →` : "Start →"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
