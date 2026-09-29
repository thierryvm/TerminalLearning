/**
 * LessonPage and exercises (29 September 2026). The page used to jump to the
 * next lesson 2.5 s after the right command, before the learner had read the
 * result. Now the success shows in the panel and in the terminal (the only
 * pane visible on mobile), and « Suivant » is the learner's choice. Multi-step
 * exercises list their steps and move on as the terminal state changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { LessonPage } from '../app/components/LessonPage';

const completeLesson = vi.fn();
let completed = false;

vi.mock('../app/context/ProgressContext', () => ({
  useProgress: () => ({
    completeLesson,
    isLessonCompleted: () => completed,
    isModuleUnlocked: () => true,
  }),
}));
vi.mock('../app/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
let env = 'linux';
vi.mock('../app/context/EnvironmentContext', () => ({ useEnvironment: () => ({ selectedEnv: env }) }));
vi.mock('../app/hooks/useLessonSEO', () => ({ useLessonSEO: () => undefined }));
vi.mock('@/lib/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'student' }) }));
vi.mock('../app/components/ai/AiTutorPanel', () => ({ AiTutorPanel: () => null, isAiTutorEnabled: () => false }));

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function page(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/learn/:moduleId/:lessonId" element={<><LessonPage /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

function open(path: string) {
  return render(page(path));
}

function type(command: string) {
  const input = screen.getByLabelText('Commande terminal');
  fireEvent.change(input, { target: { value: command } });
  fireEvent.submit(input.closest('form')!);
}

beforeEach(() => {
  completeLesson.mockClear();
  completed = false;
  env = 'linux';
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('LessonPage — a one-command exercise', () => {
  it('shows the success in the terminal and the panel, and stays on the lesson', () => {
    open('/app/learn/navigation/pwd');
    type('pwd');
    expect(completeLesson).toHaveBeenCalledWith('navigation', 'pwd');
    expect(screen.getByText(/^✓ Exercice réussi ! /)).toBeInTheDocument();
    expect(screen.getByText('→ « Suivant » pour passer à la leçon suivante.')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(within(status).getByRole('button', { name: /Suivant/ })).toBeInTheDocument();
    // No auto-advance: the learner reads, then chooses.
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('where').textContent).toBe('/app/learn/navigation/pwd');
    fireEvent.click(within(status).getByRole('button', { name: /Suivant/ }));
    expect(screen.getByTestId('where').textContent).toBe('/app/learn/navigation/ls');
  });

  it('does not count a command that failed', () => {
    open('/app/learn/variables/dotenv');
    type('cat .env');
    expect(screen.getByText('cat: .env: No such file or directory')).toBeInTheDocument();
    expect(completeLesson).not.toHaveBeenCalled();
  });
});

describe('LessonPage — a multi-step exercise', () => {
  it('lists the steps, announces the next one in the terminal, and completes at the last', () => {
    open('/app/learn/github-collaboration/conflicts');
    const steps = screen.getByRole('list', { name: "Étapes de l'exercice" });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(5);
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/^Étape 1\/5 : Lancez la fusion/)).toBeInTheDocument();

    type('git merge feature/nouvelle-feature');
    expect(screen.getByText('✓ Étape 1/5 réussie.')).toBeInTheDocument();
    expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Afficher un indice' })).toBeInTheDocument();

    for (const cmd of ['cat index.html', 'git checkout --theirs index.html', 'git add index.html']) type(cmd);
    expect(completeLesson).not.toHaveBeenCalled();
    type('git commit --no-edit');
    expect(completeLesson).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole('status')).getByRole('button', { name: /Suivant/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher un indice' })).toBeNull();
  });

  it('starts over on « Réinitialiser »', () => {
    open('/app/learn/github-collaboration/conflicts');
    type('git merge feature/nouvelle-feature');
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser le terminal' }));
    const steps = screen.getByRole('list', { name: "Étapes de l'exercice" });
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('✓ Étape 1/5 réussie.')).toBeNull();
  });

  it('starts over after Linux → Windows → Linux, like the new terminal it shows', () => {
    const { rerender } = open('/app/learn/github-collaboration/conflicts');
    type('git merge feature/nouvelle-feature');
    type('cat index.html');
    env = 'windows';
    rerender(page('/app/learn/github-collaboration/conflicts'));
    env = 'linux';
    rerender(page('/app/learn/github-collaboration/conflicts'));
    const steps = screen.getByRole('list', { name: "Étapes de l'exercice" });
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    // The terminal is fresh too: no merge yet, so the first step is still to do.
    type('git status');
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
  });

  it('can be done again once completed, without recording it twice', () => {
    completed = true;
    open('/app/learn/variables/dotenv');
    expect(screen.getByText(/^✓ Exercice déjà réussi/)).toBeInTheDocument();
    type('cd projets');
    type('cat .env');
    expect(screen.getByText(/^✓ Exercice réussi ! /)).toBeInTheDocument();
    expect(completeLesson).not.toHaveBeenCalled();
  });
});
