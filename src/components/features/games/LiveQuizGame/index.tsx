'use client';

import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2, Play, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type QuizEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type Player = { id: string; name: string };

type QuizRound = {
  roundId: string;
  questionId: string;
  text: string;
  options: string[];
  correctIndex: number;
  subjectName: string;
  chapterName: string;
  expectedPlayers: string[];
};

function joinedPlayers(events: QuizEvent[]) {
  const players = new Map<string, Player>();
  for (const event of events) {
    if (event.event_type !== 'join' || !event.user_id || players.has(event.user_id)) continue;
    players.set(event.user_id, {
      id: event.user_id,
      name: String(event.payload.name || 'Student').slice(0, 20),
    });
  }
  return [...players.values()];
}

function isQuizRound(payload: Record<string, unknown>): payload is Record<string, unknown> & QuizRound {
  return (
    typeof payload.roundId === 'string' &&
    typeof payload.questionId === 'string' &&
    typeof payload.text === 'string' &&
    Array.isArray(payload.options) &&
    typeof payload.correctIndex === 'number' &&
    Array.isArray(payload.expectedPlayers)
  );
}

export function LiveQuizGame({
  events,
  currentUserId,
  currentUserName,
  remainingSeconds,
  sendEvent,
}: {
  events: QuizEvent[];
  currentUserId: string | null;
  currentUserName: string;
  remainingSeconds: number;
  sendEvent: (eventType: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const players = useMemo(() => joinedPlayers(events), [events]);
  const hostId = players[0]?.id || null;
  const isHost = currentUserId === hostId;
  const roundEvents = useMemo(
    () => events.filter((event) => event.event_type === 'quiz_round' && isQuizRound(event.payload)),
    [events],
  );
  const round = (roundEvents.at(-1)?.payload || null) as QuizRound | null;

  const answers = useMemo(() => {
    const selected = new Map<string, { id: string; answerIndex: number; name: string }>();
    if (!round) return selected;
    for (const event of events) {
      if (
        event.event_type !== 'quiz_answer' ||
        !event.user_id ||
        event.payload.roundId !== round.roundId ||
        !round.expectedPlayers.includes(event.user_id)
      ) {
        continue;
      }
      const answerIndex = Number(event.payload.answerIndex);
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= round.options.length) continue;
      selected.set(event.user_id, {
        id: event.user_id,
        answerIndex,
        name: String(event.payload.name || players.find((player) => player.id === event.user_id)?.name || 'Student').slice(0, 20),
      });
    }
    return selected;
  }, [events, players, round]);

  const myAnswer = currentUserId ? answers.get(currentUserId)?.answerIndex : undefined;
  const revealed = Boolean(
    round?.expectedPlayers.length &&
    round.expectedPlayers.every((playerId) => answers.has(playerId)),
  );
  const waitingNames = round
    ? round.expectedPlayers
        .filter((playerId) => !answers.has(playerId))
        .map((playerId) => players.find((player) => player.id === playerId)?.name || 'Student')
    : [];

  const scores = useMemo(() => {
    const result = new Map<string, number>();
    const rounds = new Map<string, QuizRound>();
    const roundAnswers = new Map<string, Map<string, number>>();
    for (const event of events) {
      if (event.event_type === 'quiz_round' && isQuizRound(event.payload)) {
        rounds.set(event.payload.roundId, event.payload);
        roundAnswers.set(event.payload.roundId, new Map());
        continue;
      }
      if (event.event_type !== 'quiz_answer' || !event.user_id) continue;
      const roundId = String(event.payload.roundId || '');
      const eventRound = rounds.get(roundId);
      if (!eventRound || !eventRound.expectedPlayers.includes(event.user_id)) continue;
      roundAnswers.get(roundId)?.set(event.user_id, Number(event.payload.answerIndex));
    }
    for (const [roundId, eventRound] of rounds) {
      const selected = roundAnswers.get(roundId);
      if (!selected || !eventRound.expectedPlayers.every((playerId) => selected.has(playerId))) continue;
      for (const [playerId, answerIndex] of selected) {
        if (answerIndex === eventRound.correctIndex) {
          result.set(playerId, (result.get(playerId) || 0) + 1);
        }
      }
    }
    return result;
  }, [events]);

  const startRound = async () => {
    if (!isHost || loadingQuestion || remainingSeconds <= 0) return;
    setLoadingQuestion(true);
    try {
      const usedQuestionIds = roundEvents
        .map((event) => String(event.payload.questionId || ''))
        .filter(Boolean)
        .slice(-20);
      const response = await fetch(
        `/api/games/quiz-question${usedQuestionIds.length ? `?exclude=${encodeURIComponent(usedQuestionIds.join(','))}` : ''}`,
        { cache: 'no-store' },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'A question could not be loaded.');
      const question = json.question as Omit<QuizRound, 'roundId' | 'questionId' | 'expectedPlayers'> & { id: string };
      await sendEvent('quiz_round', {
        roundId: crypto.randomUUID(),
        questionId: question.id,
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
        subjectName: question.subjectName,
        chapterName: question.chapterName,
        expectedPlayers: players.map((player) => player.id),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'A question could not be loaded.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const selectAnswer = async (answerIndex: number) => {
    if (!round || !currentUserId || myAnswer !== undefined || revealed || remainingSeconds <= 0) return;
    if (!round.expectedPlayers.includes(currentUserId)) {
      toast.info('You joined during this question and can play from the next round.');
      return;
    }
    try {
      await sendEvent('quiz_answer', {
        roundId: round.roundId,
        answerIndex,
        name: currentUserName,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your answer could not be submitted.');
    }
  };

  if (!round) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
        <BookOpen className="text-violet-400 h-10 w-10" />
        <h2 className="mt-4 text-lg font-bold">Ready for a class question?</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          A random MCQ will come from the host&apos;s saved board, class, books, and selected science group.
        </p>
        {isHost ? (
          <Button className="mt-5" variant="gradient" onClick={() => void startRound()} disabled={!players.length || loadingQuestion}>
            {loadingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start first question
          </Button>
        ) : (
          <p className="text-muted-foreground mt-5 text-sm">Waiting for {players[0]?.name || 'the room host'} to start.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{round.subjectName}</Badge>
            <Badge variant="outline">{round.chapterName}</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Question {roundEvents.length} · {answers.size}/{round.expectedPlayers.length} answered
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player) => (
            <Badge key={player.id} variant="outline" className="gap-1.5">
              <Trophy className="h-3 w-3 text-amber-500" />
              {player.name}: {scores.get(player.id) || 0}
            </Badge>
          ))}
        </div>
      </div>

      <h2 className="text-lg leading-7 font-semibold sm:text-xl">{round.text}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {round.options.map((option, optionIndex) => {
          const selectedPlayers = [...answers.values()].filter((answer) => answer.answerIndex === optionIndex);
          const isCorrect = revealed && optionIndex === round.correctIndex;
          const isMine = myAnswer === optionIndex;
          return (
            <button
              key={optionIndex}
              type="button"
              onClick={() => void selectAnswer(optionIndex)}
              disabled={myAnswer !== undefined || revealed || !round.expectedPlayers.includes(currentUserId || '')}
              className={`min-h-24 rounded-lg border p-4 text-left transition ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                  : isMine
                    ? 'border-violet-500 bg-violet-500/12'
                    : 'border-border bg-card hover:border-violet-500/50 hover:bg-violet-500/5'
              }`}
            >
              <span className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border'}`}>
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{option}</span>
                {isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
              </span>
              {selectedPlayers.length > 0 && (
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {selectedPlayers.map((player) => (
                    <span key={player.id} className="rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">
                      {player.name}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Users className="text-muted-foreground h-4 w-4" />
          {revealed
            ? 'Everyone answered. The correct option is now green.'
            : myAnswer === undefined
              ? 'Choose one option. Everyone can see who selected each answer.'
              : `Waiting for ${waitingNames.join(', ')}.`}
        </div>
        {revealed && isHost && (
          <Button size="sm" variant="gradient" onClick={() => void startRound()} disabled={loadingQuestion}>
            {loadingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Next question
          </Button>
        )}
      </div>
    </div>
  );
}
