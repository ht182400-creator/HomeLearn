import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { PracticeSession } from "@/components/dashboard/practice-session";

interface PageProps {
  params: { sessionId: string };
  searchParams: { questions?: string };
}

export const metadata: Metadata = {
  title: "练习中 - HomeLearn",
  description: "正在进行的练习",
};

export default async function PracticeSessionPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  // 获取练习会话
  const practiceSession = await prisma.practiceSession.findFirst({
    where: {
      id: params.sessionId,
      child: {
        parentId: session?.user?.id,
      },
    },
    include: {
      child: true,
      subject: true,
    },
  });

  if (!practiceSession) {
    notFound();
  }

  // 解析题目数据
  let questions: any[] = [];
  if (searchParams.questions) {
    try {
      questions = JSON.parse(searchParams.questions);
    } catch (e) {
      console.error("Failed to parse questions:", e);
    }
  }

  // 如果没有传入题目，从数据库获取
  if (questions.length === 0) {
    const answers = await prisma.practiceAnswer.findMany({
      where: { sessionId: params.sessionId },
      select: { questionId: true },
    });
    const answeredIds = answers.map((a) => a.questionId);

    // 获取题目（排除已回答的）
    const sessionQuestions = await prisma.question.findMany({
      where: {
        subjectId: practiceSession.subjectId,
        creatorId: session?.user?.id,
      },
      select: {
        id: true,
        content: true,
        type: true,
        difficulty: true,
      },
      take: practiceSession.questionCount,
    });

    questions = sessionQuestions.filter((q) => !answeredIds.includes(q.id));
  }

  return (
    <PracticeSession
      sessionId={params.sessionId}
      questions={questions}
      childId={practiceSession.child.id}
      childName={practiceSession.child.name}
      subjectName={practiceSession.subject.name}
    />
  );
}
