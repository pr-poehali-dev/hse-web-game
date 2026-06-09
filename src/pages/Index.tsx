import { useState, useEffect } from "react";
import { ROUNDS, type Round, type Choice } from "@/data/gameData";

type Screen = "menu" | "game" | "consequence" | "round_complete" | "game_over" | "victory";

interface GameState {
  budget: number;
  hse: number;
  schedule: number;
  roundIndex: number;
  dilemmaIndex: number;
  lastChoice: Choice | null;
  pendingConsequence: boolean;
  safeChoices: number;
  unsafeChoices: number;
  savedBudget: number;
}

const INITIAL_STATE: GameState = {
  budget: 100,
  hse: 100,
  schedule: 100,
  roundIndex: 0,
  dilemmaIndex: 0,
  lastChoice: null,
  pendingConsequence: false,
  safeChoices: 0,
  unsafeChoices: 0,
  savedBudget: 0,
};

const clamp = (val: number) => Math.max(0, Math.min(100, val));

const MetricBar = ({
  label,
  value,
  icon,
  animate,
}: {
  label: string;
  value: number;
  icon: string;
  animate?: boolean;
}) => {
  const barColor =
    value > 60 ? "#111827" : value > 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="metric-item">
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
        <span
          className="metric-value"
          style={{ color: value < 30 ? "#ef4444" : value < 60 ? "#f59e0b" : "#111827" }}
        >
          {Math.round(value)}%
        </span>
      </div>
      <div className="metric-track">
        <div
          className={animate ? "metric-fill metric-animate" : "metric-fill"}
          style={{
            width: `${value}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
};

const DeltaBadge = ({ delta }: { delta: number }) => {
  if (delta === 0) return null;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "12px",
        fontWeight: 600,
        color: delta > 0 ? "#16a34a" : "#dc2626",
        background: delta > 0 ? "#dcfce7" : "#fee2e2",
        borderRadius: "4px",
        padding: "1px 7px",
        marginLeft: "6px",
      }}
    >
      {delta > 0 ? `+${delta}%` : `${delta}%`}
    </span>
  );
};

export default function Index() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gs, setGs] = useState<GameState>(INITIAL_STATE);
  const [animMetrics, setAnimMetrics] = useState(false);
  const [choiceMade, setChoiceMade] = useState<string | null>(null);
  const [cardAnim, setCardAnim] = useState(false);

  const currentRound: Round = ROUNDS[gs.roundIndex];
  const currentDilemma = currentRound?.dilemmas[gs.dilemmaIndex];

  useEffect(() => {
    if (animMetrics) {
      const t = setTimeout(() => setAnimMetrics(false), 900);
      return () => clearTimeout(t);
    }
  }, [animMetrics]);

  useEffect(() => {
    if (screen === "game") {
      setCardAnim(true);
      const t = setTimeout(() => setCardAnim(false), 500);
      return () => clearTimeout(t);
    }
  }, [screen, gs.dilemmaIndex]);

  const startGame = () => {
    setGs(INITIAL_STATE);
    setChoiceMade(null);
    setScreen("game");
  };

  const handleChoice = (choice: Choice) => {
    if (choiceMade) return;
    setChoiceMade(choice.id);

    setTimeout(() => {
      setGs((prev) => ({
        ...prev,
        budget: clamp(prev.budget + choice.budgetDelta),
        hse: clamp(prev.hse + choice.hseDelta),
        schedule: clamp(prev.schedule + choice.scheduleDelta),
        lastChoice: choice,
        pendingConsequence: !choice.isSafe && !!choice.consequenceDelta,
        safeChoices: prev.safeChoices + (choice.isSafe ? 1 : 0),
        unsafeChoices: prev.unsafeChoices + (choice.isSafe ? 0 : 1),
      }));
      setAnimMetrics(true);
      setScreen("consequence");
    }, 350);
  };

  const advanceGame = (stateOverride?: Partial<GameState>) => {
    setChoiceMade(null);
    setGs((prev) => {
      const merged = { ...prev, ...stateOverride };

      if (merged.budget <= 5) {
        setScreen("game_over");
        return merged;
      }

      const nextDilemma = merged.dilemmaIndex + 1;
      if (nextDilemma >= currentRound.dilemmas.length) {
        const nextRound = merged.roundIndex + 1;
        if (nextRound >= ROUNDS.length) {
          const saved = Math.max(0, Math.round((merged.budget - 40) * 2.5));
          setScreen("victory");
          return { ...merged, savedBudget: saved };
        }
        setScreen("round_complete");
        return { ...merged, dilemmaIndex: 0, roundIndex: nextRound };
      }
      setScreen("game");
      return { ...merged, dilemmaIndex: nextDilemma };
    });
  };

  const proceedFromConsequence = () => {
    const choice = gs.lastChoice;
    if (!choice) { advanceGame(); return; }

    if (gs.pendingConsequence && choice.consequenceDelta) {
      const d = choice.consequenceDelta;
      const newBudget = clamp(gs.budget + (d.budget ?? 0));
      const newHse = clamp(gs.hse + (d.hse ?? 0));
      const newSchedule = clamp(gs.schedule + (d.schedule ?? 0));
      setAnimMetrics(true);
      advanceGame({ budget: newBudget, hse: newHse, schedule: newSchedule, pendingConsequence: false });
    } else {
      advanceGame();
    }
  };

  // ── MENU ──
  if (screen === "menu") {
    return (
      <div className="hse-wrap">
        <div className="hse-menu">
          <div className="menu-eyebrow">HSE · СТРОИТЕЛЬСТВО · ИГРА</div>
          <h1 className="menu-heading">
            Безопасность<br />
            <em>экономит деньги</em>
          </h1>
          <p className="menu-sub">
            Вы — директор проекта жилого комплекса.<br />
            4 раунда, 12 дилемм, один бюджет на всё.
          </p>

          <div className="menu-pills">
            <div className="menu-pill">
              <strong>4</strong><span>раунда</span>
            </div>
            <div className="menu-pill">
              <strong>12</strong><span>дилемм</span>
            </div>
            <div className="menu-pill">
              <strong>3</strong><span>метрики</span>
            </div>
          </div>

          <button className="hse-btn-primary" onClick={startGame}>
            Новая игра
          </button>
          <p className="menu-footnote">
            Каждый «авось» обойдётся в три раза дороже
          </p>
        </div>
      </div>
    );
  }

  // ── GAME OVER ──
  if (screen === "game_over") {
    return (
      <div className="hse-wrap">
        <div className="hse-end">
          <div className="end-emoji">💸</div>
          <div className="end-eyebrow end-eyebrow-bad">Проект закрыт</div>
          <h2 className="end-heading">Бюджет исчерпан</h2>
          <p className="end-text">
            Инвестор в ярости. Прорабы разошлись. Михалыч жив —
            это единственное, что можно занести в актив.
          </p>
          <div className="end-grid">
            <div className="end-cell">
              <span>Безопасных решений</span>
              <strong>{gs.safeChoices}</strong>
            </div>
            <div className="end-cell">
              <span>Опасных решений</span>
              <strong style={{ color: "#dc2626" }}>{gs.unsafeChoices}</strong>
            </div>
            <div className="end-cell">
              <span>HSE-индекс</span>
              <strong>{Math.round(gs.hse)}%</strong>
            </div>
            <div className="end-cell">
              <span>Бюджет</span>
              <strong style={{ color: "#dc2626" }}>{Math.round(gs.budget)}%</strong>
            </div>
          </div>
          <button className="hse-btn-primary" onClick={startGame}>
            Попробовать снова
          </button>
          <button className="hse-btn-ghost" onClick={() => setScreen("menu")}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  // ── VICTORY ──
  if (screen === "victory") {
    const medal = gs.hse >= 80 ? "🏆" : gs.hse >= 60 ? "🥈" : "🥉";
    const title =
      gs.hse >= 80
        ? "Образцовый директор"
        : gs.hse >= 60
        ? "Хороший результат"
        : "Могло быть и хуже";

    return (
      <div className="hse-wrap">
        <div className="hse-end">
          <div className="end-emoji">{medal}</div>
          <div className="end-eyebrow end-eyebrow-good">Объект сдан</div>
          <h2 className="end-heading">{title}</h2>
          <p className="end-text">
            Жильцы въезжают. Все живы.{" "}
            {gs.savedBudget > 0
              ? `Культура безопасности сберегла проекту ~${gs.savedBudget} млн ₽.`
              : "Финансово было тяжело — но команда выжила."}
          </p>
          <div className="end-grid">
            <div className="end-cell">
              <span>Бюджет</span>
              <strong style={{ color: gs.budget > 50 ? "#16a34a" : "#f59e0b" }}>
                {Math.round(gs.budget)}%
              </strong>
            </div>
            <div className="end-cell">
              <span>HSE-индекс</span>
              <strong style={{ color: gs.hse > 60 ? "#16a34a" : "#f59e0b" }}>
                {Math.round(gs.hse)}%
              </strong>
            </div>
            <div className="end-cell">
              <span>График</span>
              <strong>{Math.round(gs.schedule)}%</strong>
            </div>
            <div className="end-cell">
              <span>Верных решений</span>
              <strong>{gs.safeChoices} / 12</strong>
            </div>
          </div>
          <button className="hse-btn-primary" onClick={startGame}>
            Сыграть снова
          </button>
          <button className="hse-btn-ghost" onClick={() => setScreen("menu")}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  // ── ROUND COMPLETE ──
  if (screen === "round_complete") {
    const done = ROUNDS[gs.roundIndex - 1];
    const next = ROUNDS[gs.roundIndex];
    return (
      <div className="hse-wrap">
        <div className="hse-round-done">
          <div className="rd-eyebrow">Этап завершён</div>
          <div className="rd-icon">{done.icon}</div>
          <h2 className="rd-title">{done.subtitle}</h2>
          <p className="rd-sub">Команда переходит к следующей стадии строительства</p>

          <div className="rd-metrics">
            <MetricBar label="Бюджет" value={gs.budget} icon="💰" />
            <MetricBar label="HSE" value={gs.hse} icon="🛡️" />
            <MetricBar label="График" value={gs.schedule} icon="📅" />
          </div>

          <div className="rd-next">
            <span className="rd-next-label">Следующий этап</span>
            <div className="rd-next-row">
              <span>{next.icon}</span>
              <span>{next.subtitle}</span>
            </div>
          </div>

          <button className="hse-btn-primary" onClick={() => setScreen("game")}>
            Продолжить →
          </button>
        </div>
      </div>
    );
  }

  // ── CONSEQUENCE ──
  if (screen === "consequence" && gs.lastChoice) {
    const choice = gs.lastChoice;
    const hasConsequence = !choice.isSafe && !!choice.consequenceDelta;

    return (
      <div className="hse-wrap">
        <div className="hse-game">
          {/* Header */}
          <header className="hse-header">
            <div className="hse-header-top">
              <span className="hdr-round">{currentRound.icon} {currentRound.subtitle}</span>
              <span className="hdr-progress">
                Раунд {gs.roundIndex + 1}/{ROUNDS.length} · Ситуация {gs.dilemmaIndex + 1}/{currentRound.dilemmas.length}
              </span>
            </div>
            <div className="hse-metrics">
              <MetricBar label="Бюджет" value={gs.budget} icon="💰" animate={animMetrics} />
              <MetricBar label="HSE" value={gs.hse} icon="🛡️" animate={animMetrics} />
              <MetricBar label="График" value={gs.schedule} icon="📅" animate={animMetrics} />
            </div>
          </header>

          <main className="hse-main">
            <div className={`cons-card ${choice.isSafe ? "cons-safe" : "cons-danger"}`}>
              <div className="cons-tag">
                {choice.isSafe ? "✓ Верное решение" : "⚠ Последствие"}
              </div>
              <h3 className="cons-choice">{choice.label}</h3>
              <p className="cons-text">{choice.consequence}</p>

              <div className="cons-deltas">
                {choice.budgetDelta !== 0 && (
                  <div className="cons-delta-row">
                    <span>💰 Бюджет</span>
                    <DeltaBadge delta={choice.budgetDelta} />
                  </div>
                )}
                {choice.hseDelta !== 0 && (
                  <div className="cons-delta-row">
                    <span>🛡️ HSE</span>
                    <DeltaBadge delta={choice.hseDelta} />
                  </div>
                )}
                {choice.scheduleDelta !== 0 && (
                  <div className="cons-delta-row">
                    <span>📅 График</span>
                    <DeltaBadge delta={choice.scheduleDelta} />
                  </div>
                )}
              </div>

              {hasConsequence && choice.consequenceDelta && (
                <div className="cons-incoming">
                  <div className="cons-incoming-label">🔴 Дополнительный ущерб</div>
                  <div className="cons-deltas">
                    {choice.consequenceDelta.budget !== undefined && (
                      <div className="cons-delta-row">
                        <span>💰 Бюджет</span>
                        <DeltaBadge delta={choice.consequenceDelta.budget} />
                      </div>
                    )}
                    {choice.consequenceDelta.hse !== undefined && (
                      <div className="cons-delta-row">
                        <span>🛡️ HSE</span>
                        <DeltaBadge delta={choice.consequenceDelta.hse} />
                      </div>
                    )}
                    {choice.consequenceDelta.schedule !== undefined && (
                      <div className="cons-delta-row">
                        <span>📅 График</span>
                        <DeltaBadge delta={choice.consequenceDelta.schedule} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="hse-btn-primary hse-btn-wide" onClick={proceedFromConsequence}>
              {hasConsequence ? "Принять последствия →" : "Следующая ситуация →"}
            </button>
          </main>
        </div>
      </div>
    );
  }

  // ── GAME ──
  if (screen === "game" && currentDilemma) {
    return (
      <div className="hse-wrap">
        <div className="hse-game">
          <header className="hse-header">
            <div className="hse-header-top">
              <span className="hdr-round">{currentRound.icon} {currentRound.subtitle}</span>
              <span className="hdr-progress">
                Раунд {gs.roundIndex + 1}/{ROUNDS.length} · Ситуация {gs.dilemmaIndex + 1}/{currentRound.dilemmas.length}
              </span>
            </div>
            <div className="hse-metrics">
              <MetricBar label="Бюджет" value={gs.budget} icon="💰" animate={animMetrics} />
              <MetricBar label="HSE" value={gs.hse} icon="🛡️" animate={animMetrics} />
              <MetricBar label="График" value={gs.schedule} icon="📅" animate={animMetrics} />
            </div>
          </header>

          <main className="hse-main">
            <div className={`dilemma-card ${cardAnim ? "card-enter" : ""}`}>
              <div className="dilemma-top">
                <span className="dilemma-icon-bg">{currentDilemma.icon}</span>
                <h2 className="dilemma-title">{currentDilemma.title}</h2>
              </div>
              <p className="dilemma-situation">{currentDilemma.situation}</p>
              <blockquote className="dilemma-quote">{currentDilemma.context}</blockquote>
            </div>

            <div className="choices-list">
              {currentDilemma.choices.map((choice) => (
                <button
                  key={choice.id}
                  className={[
                    "choice-btn",
                    choiceMade === choice.id ? "choice-active" : "",
                    choiceMade && choiceMade !== choice.id ? "choice-dim" : "",
                  ].join(" ")}
                  onClick={() => handleChoice(choice)}
                  disabled={!!choiceMade}
                >
                  <div className="choice-btn-top">
                    <span className="choice-btn-label">{choice.label}</span>
                  </div>
                  <p className="choice-btn-desc">{choice.description}</p>
                  <div className="choice-btn-hints">
                    {choice.budgetDelta !== 0 && (
                      <span className={`chint ${choice.budgetDelta > 0 ? "chint-up" : "chint-dn"}`}>
                        💰 {choice.budgetDelta > 0 ? `+${choice.budgetDelta}%` : `${choice.budgetDelta}%`}
                      </span>
                    )}
                    {choice.hseDelta !== 0 && (
                      <span className={`chint ${choice.hseDelta > 0 ? "chint-up" : "chint-dn"}`}>
                        🛡️ {choice.hseDelta > 0 ? `+${choice.hseDelta}%` : `${choice.hseDelta}%`}
                      </span>
                    )}
                    {choice.scheduleDelta !== 0 && (
                      <span className={`chint ${choice.scheduleDelta > 0 ? "chint-up" : "chint-dn"}`}>
                        📅 {choice.scheduleDelta > 0 ? `+${choice.scheduleDelta}%` : `${choice.scheduleDelta}%`}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
}
