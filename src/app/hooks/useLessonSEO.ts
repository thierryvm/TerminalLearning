import { useEffect } from 'react';
import { Module, Lesson } from '../data/curriculum';

const DEFAULT_TITLE = 'Terminal Learning — Apprends le terminal pas à pas';
const DEFAULT_DESCRIPTION = 'Apprends les commandes du terminal gratuitement. 11 modules progressifs (Linux, macOS, Windows), émulateur interactif, progression sauvegardée. Pour débutants, open source.';
const DEFAULT_URL = 'https://terminallearning.dev/';

const BASE_URL = 'https://terminallearning.dev';

function setMeta(sel: string, attr: string, val: string) {
  const el = document.querySelector(sel);
  if (el) el.setAttribute(attr, val);
}

interface PageSEO {
  title: string;
  description: string;
  path: string;
}

export function usePageSEO({ title, description, path }: PageSEO) {
  useEffect(() => {
    const url = `${BASE_URL}${path}`;
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('link[rel="canonical"]', 'href', DEFAULT_URL);
      setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', 'content', DEFAULT_URL);
      setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION);
    };
  }, [title, description, path]);
}

export function useLessonSEO(mod: Module, lesson: Lesson, moduleId: string, lessonId: string) {
  useEffect(() => {
    const title = `${lesson.title} — ${mod.title} | Terminal Learning`;
    const description = lesson.description
      || `Apprends ${lesson.title} dans le module ${mod.title}. Exercice interactif avec émulateur terminal. Gratuit, open source.`;
    const url = `https://terminallearning.dev/app/learn/${moduleId}/${lessonId}`;

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('link[rel="canonical"]', 'href', DEFAULT_URL);
      setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', 'content', DEFAULT_URL);
      setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION);
    };
  }, [mod, lesson, moduleId, lessonId]);
}
