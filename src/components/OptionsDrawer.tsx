import { fmt, useI18n, LANGUAGE_NAMES } from '../i18n';
import type { Language, Settings } from '../types';
import { downloadExport, pickFile, type AppExport } from '../storage';
import type { FolderStatus } from '../localFolder';

interface Props {
  settings: Settings;
  setSettings: (updater: (prev: Settings) => Settings) => void;
  folder: FolderStatus;
  backupFailing: boolean;
  onPickFolder: () => void;
  onReauthorizeFolder: () => void;
  onForgetFolder: () => void;
  exportPayload: () => AppExport;
  onImport: (text: string) => void; // throws on invalid input
  onReset: () => void;
  onClose: () => void;
}

export default function OptionsDrawer({
  settings,
  setSettings,
  folder,
  backupFailing,
  onPickFolder,
  onReauthorizeFolder,
  onForgetFolder,
  exportPayload,
  onImport,
  onReset,
  onClose,
}: Props) {
  const t = useI18n();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  async function handleImport() {
    const text = await pickFile('.json,application/json');
    if (text === null) return;
    try {
      onImport(text);
      alert(t.options.importOk);
    } catch (err) {
      alert(fmt(t.options.importError, { msg: err instanceof Error ? err.message : String(err) }));
    }
  }

  function handleReset() {
    const answer = prompt(t.options.resetConfirm);
    if (answer === 'YES' || answer === 'TAK') onReset();
  }

  return (
    <div className="tb-drawer-backdrop" onClick={onClose}>
      <aside className="tb-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="tb-drawer-head">
          <h2>{t.options.heading}</h2>
          <button className="tb-close" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        <label className="tb-opt">
          <span>{t.options.uiLanguage}</span>
          <select value={settings.language} onChange={(e) => set('language', e.target.value as Language)}>
            {(Object.keys(LANGUAGE_NAMES) as Language[]).map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </select>
        </label>

        <label className="tb-opt">
          <span>{t.options.sound}</span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => set('sound', e.target.checked)} />
        </label>
        {settings.sound && (
          <label className="tb-opt">
            <span>{t.options.volume}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => set('volume', Number(e.target.value))}
            />
          </label>
        )}

        <label className="tb-opt">
          <span>{t.options.timeDuration}</span>
          <div className="tb-seg">
            {([15, 30, 60] as const).map((s) => (
              <button
                key={s}
                className={settings.timeAttackSeconds === s ? 'on' : ''}
                onClick={() => set('timeAttackSeconds', s)}
              >
                {fmt(t.options.seconds, { n: s })}
              </button>
            ))}
          </div>
        </label>

        <label className="tb-opt">
          <span>{t.options.sprintLength}</span>
          <div className="tb-seg">
            {([10, 25, 50] as const).map((n) => (
              <button key={n} className={settings.sprintWords === n ? 'on' : ''} onClick={() => set('sprintWords', n)}>
                {fmt(t.options.words, { n })}
              </button>
            ))}
          </div>
        </label>

        <h3>{t.options.dataHeading}</h3>
        <p className="tb-hint">{t.options.dataHint}</p>

        <div className="tb-backup">
          <span className="tb-opt-label">{t.options.folderBackup}</span>
          {folder.state === 'unsupported' && <p className="tb-hint">{t.options.folderUnsupported}</p>}
          {folder.state === 'none' && (
            <button className="tb-secondary" onClick={onPickFolder}>
              {t.options.folderPick}
            </button>
          )}
          {folder.state === 'need-permission' && (
            <button className="tb-secondary warn" onClick={onReauthorizeFolder}>
              {fmt(t.options.folderNeedsPermission, { name: folder.name })}
            </button>
          )}
          {folder.state === 'active' && (
            <>
              <span className={`tb-backup-pill ${backupFailing ? 'bad' : 'ok'}`}>
                {backupFailing ? t.options.folderFailing : fmt(t.options.folderActive, { name: folder.name })}
              </span>
              {backupFailing && (
                <button className="tb-secondary" onClick={onPickFolder}>
                  {t.options.folderPick}
                </button>
              )}
              <button className="tb-linkish" onClick={onForgetFolder}>
                {t.options.folderForget}
              </button>
            </>
          )}
        </div>

        <div className="tb-data-actions">
          <button className="tb-secondary" onClick={() => downloadExport(exportPayload())}>
            {t.options.exportJson}
          </button>
          <button className="tb-secondary" onClick={handleImport}>
            {t.options.importJson}
          </button>
          <button className="tb-danger" onClick={handleReset}>
            {t.options.resetAll}
          </button>
        </div>
      </aside>
    </div>
  );
}
