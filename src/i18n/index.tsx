import { createContext, useContext, type ReactNode } from 'react';
import type { Language } from '../types';
import { en, type Translation } from './en';
import { pl } from './pl';

export { fmt } from './en';
export type { Translation };

/** Adding a language = one file (typed as Translation) + one entry here. */
export const DICTIONARIES: Record<Language, Translation> = { en, pl };

export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', pl: 'Polski' };

const I18nContext = createContext<Translation>(en);

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={DICTIONARIES[language] ?? en}>{children}</I18nContext.Provider>;
}

/** Returns the active dictionary; use as `const t = useI18n()` → `t.nav.home`. */
export function useI18n(): Translation {
  return useContext(I18nContext);
}
