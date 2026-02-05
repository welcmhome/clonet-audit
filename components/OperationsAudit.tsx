import React, { useState, useEffect, useRef } from "react";

type Step =
  | "intro"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9"
  | "loading"
  | "results"
  | "contact"
  | "final"
  | "done";

const inefficiencyOptions = [
  "Lead intake / inquiries",
  "Pricing or quoting",
  "Scheduling / logistics",
  "Internal admin or reporting",
  "Customer follow-ups",
  "Data scattered across tools",
  "Website or customer-facing systems",
];

async function submitToBackend(payload: { answers: Record<string, unknown>; contact: Record<string, string> }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/submit` : "/api/submit";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("SUBMIT_NOT_AVAILABLE");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Submission failed");
  }
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value.trim());
}

function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function isValidPhone(value: string): boolean {
  return getPhoneDigits(value).length === 10;
}

export const OperationsAudit: React.FC = () => {
  const [step, setStep] = useState<Step>("intro");

  const [answers, setAnswers] = useState({
    q1: "",
    q2: [] as string[],
    q3: "",
    q4: "",
    q5: "",
    q6: "",
    q7: "",
    q8: "",
    q9: "",
  });

  const [contact, setContact] = useState({
    firstName: "",
    email: "",
    phone: "",
    company: "",
  });

  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [confetti, setConfetti] = useState<
    Array<{ id: number; color: string; angle: number; delay: number; dx: number; dy: number }>
  >([]);
  const confettiFiredRef = useRef(false);
  const blockQ1ClicksUntilRef = useRef(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showInitialLoad, setShowInitialLoad] = useState(true);

  // Initial 1.5s loading splash when opening the site
  useEffect(() => {
    const t = setTimeout(() => setShowInitialLoad(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // After Q7: show loading, then auto-advance to contact form
  useEffect(() => {
    if (step !== "loading") return;
    const t = setTimeout(() => goTo("contact"), 5000);
    return () => clearTimeout(t);
  }, [step]);

  // Quick orange confetti pop when landing on "Your results are ready"
  useEffect(() => {
    if (step !== "contact") return;
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    const colors = ["#ff5700", "#ff7a1a", "#ff9b4a"];
    const pieces = Array.from({ length: 28 }, (_, i) => {
      const angleDeg = (i / 28) * 360 + Math.random() * 20;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dist = 70 + Math.random() * 50;
      return {
        id: i,
        color: colors[i % colors.length],
        angle: angleDeg,
        delay: Math.random() * 80,
        dx: Math.cos(angleRad) * dist,
        dy: Math.sin(angleRad) * dist,
      };
    });
    setConfetti(pieces);
    const t = setTimeout(() => setConfetti([]), 1300);
    return () => clearTimeout(t);
  }, [step]);

  const doResetAudit = () => {
    confettiFiredRef.current = false;
    setAnswers({
      q1: "",
      q2: [],
      q3: "",
      q4: "",
      q5: "",
      q6: "",
      q7: "",
      q8: "",
      q9: "",
    });
    setContact({
      firstName: "",
      email: "",
      phone: "",
      company: "",
    });
    setErrors(null);
    setSubmitting(false);
    setSubmitted(false);
    setStep("intro");
    setShowExitConfirm(false);
  };

  const handleExit = () => {
    // On intro, send them back to the main site (no confirmation)
    if (step === "intro") {
      if (typeof window !== "undefined") {
        window.location.href = "https://clonet.ai";
      }
      return;
    }

    // On all other steps, show custom confirm modal
    setShowExitConfirm(true);
  };

  const goTo = (next: Step) => {
    setErrors(null);
    setStep(next);
  };

  const handleMultiToggle = (value: string) => {
    setErrors(null);
    setAnswers((prev) => {
      const exists = prev.q2.includes(value);
      if (exists) {
        return { ...prev, q2: prev.q2.filter((v) => v !== value) };
      }
      if (prev.q2.length >= 3) {
        setErrors("You can select up to 3 areas.");
        return prev;
      }
      return { ...prev, q2: [...prev.q2, value] };
    });
  };

  const handleSubmit = async () => {
    if (!contact.firstName || !contact.email || !contact.phone) {
      setErrors("Please complete all required fields.");
      return;
    }
    if (!isValidEmail(contact.email)) {
      setErrors("Please enter a valid email address.");
      return;
    }
    if (!isValidPhone(contact.phone)) {
      setErrors("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!consent) {
      setErrors("Please confirm you agree to be contacted.");
      return;
    }
    setErrors(null);
    setSubmitting(true);
    try {
      await submitToBackend({ answers, contact });
      setSubmitted(true);
      setStep("final");
    } catch (e) {
      const msg = e instanceof Error && e.message === "SUBMIT_NOT_AVAILABLE"
        ? "Submission isn’t available right now. Please try again in a few minutes or contact us."
        : "Something went wrong. Please try again.";
      setErrors(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const questionSteps: Step[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"];
  const isQuestionStep = questionSteps.includes(step);
  const currentIndex = questionSteps.indexOf(step);
  const totalQuestions = questionSteps.length;
  const progressPercent =
    currentIndex >= 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const canGoNext =
    step === "q1"
      ? !!answers.q1
      : step === "q2"
      ? answers.q2.length > 0
      : step === "q3"
      ? !!answers.q3
      : step === "q4"
      ? !!answers.q4
      : step === "q5"
      ? !!answers.q5
      : step === "q6"
      ? true // optional text field
      : step === "q7"
      ? !!answers.q7
      : step === "q8"
      ? !!answers.q8
      : step === "q9"
      ? !!answers.q9
      : step === "contact"
      ? !!(
          contact.firstName &&
          isValidEmail(contact.email) &&
          isValidPhone(contact.phone) &&
          consent
        )
      : true;

  // Initial load: same pixel loading for 1.5s when opening the site
  if (showInitialLoad) {
    return (
      <div className="audit-shell loading-shell">
        <div className="loading-fullscreen">
          <div className="loading-wrap loading-wrap-standalone">
            <p className="loading-copy">Loading…</p>
            <div className="pixel-grid pixel-grid-large" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <div key={i} className="pixel" />
              ))}
            </div>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // Loading step: only the animation, no card/header/exit
  if (step === "loading") {
    return (
      <div className="audit-shell loading-shell">
        <div className="loading-fullscreen">
          <div className="loading-wrap loading-wrap-standalone">
            <p className="loading-copy">
              Preparing your results…
            </p>
            <div className="pixel-grid pixel-grid-large" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <div key={i} className="pixel" />
              ))}
            </div>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="audit-shell">
      {confetti.length > 0 && (
        <div className="confetti-overlay" aria-hidden>
          {confetti.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                backgroundColor: p.color,
                animationDelay: `${p.delay}ms`,
                ["--dx" as string]: `${p.dx}px`,
                ["--dy" as string]: `${p.dy}px`,
                ["--angle" as string]: `${p.angle}deg`,
              }}
            />
          ))}
        </div>
      )}
      {step !== "done" && (
        <button
          type="button"
          className="exit-global"
          onClick={handleExit}
        >
          EXIT
        </button>
      )}

      {showExitConfirm && (
        <div className="exit-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div className="exit-confirm-backdrop" onClick={() => setShowExitConfirm(false)} aria-hidden />
          <div className="exit-confirm-card">
            <h3 id="exit-confirm-title" className="exit-confirm-title">Are you sure?</h3>
            <p className="exit-confirm-message">Your progress will be lost.</p>
            <div className="exit-confirm-actions">
              <button
                type="button"
                className="exit-confirm-cancel"
                onClick={() => setShowExitConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="exit-confirm-exit"
                onClick={doResetAudit}
              >
                Exit Pre-Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "intro" && <div className="intro-orange-glow" aria-hidden />}
      {step !== "intro" && <div className="page-orange-glow page-orange-glow-center" aria-hidden />}

      <div className={step === "intro" ? "audit-frame audit-frame-intro" : "audit-frame"}>
        <header className="audit-header">
          <div className={step === "intro" || step === "contact" ? "header-left header-left-intro" : "header-left"}>
            {(step === "intro" || step === "contact") && (
              <img
                src="/CLONET%20TRANSPARENT%20LOGO.png"
                alt="Clonet logo"
                className="logo-img logo-img-intro"
              />
            )}
          </div>
          <div className="header-center">
            {step !== "intro" && step !== "contact" && (
              <img
                src="/CLONET%20TRANSPARENT%20LOGO.png"
                alt="Clonet logo"
                className="logo-img"
              />
            )}
          </div>
          <div className="header-right">
            {isQuestionStep && (
              <span className="step-label">
                Step {currentIndex + 1} of {totalQuestions}
              </span>
            )}
          </div>
        </header>

        {isQuestionStep && (
          <div className="progress-row">
            <div className="progress-track">
              <div
                className="progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <main className={step === "intro" ? "audit-main intro-main" : "audit-main"}>
          {step === "intro" ? (
            <div className="intro-fullpage">
              <div className="intro-block intro-head-block">
                <p className="intro-label">[ OPERATIONS &amp; SYSTEMS PRE-AUDIT ]</p>
                <h2 className="intro-headline">SEE WHERE YOU STAND.</h2>
                <p className="intro-lead">
                  A few quick questions about how you run things today. A clear picture of your operations and where the biggest opportunities are.
                </p>
                <div className="intro-cta-wrap">
                  <button
                    className="intro-cta"
                    onClick={() => {
                      setTimeout(() => {
                        blockQ1ClicksUntilRef.current = Date.now() + 800;
                        goTo("q1");
                      }, 400);
                    }}
                  >
                    START PRE-AUDIT
                  </button>
                </div>
              </div>
              <div className="intro-block intro-analogy-block">
                <p className="intro-analogy-label">[ THE SHIFT ]</p>
                <p className="intro-analogy-text">
                  Imagine refusing to do business with the internet when it arrived. Today that looks unthinkable. The companies that said no fell behind. AI and automation are the same kind of shift. The way business is going. More information, better tools, less waste. The question isn’t whether to get on board; it’s where to start.
                </p>
              </div>
              <div className="intro-block intro-stat-block">
                <p className="intro-stat">
                  <span className="intro-stat-num">72%</span>
                  <span className="intro-stat-label">of business leaders say AI is already critical to how they operate.</span>
                </p>
              </div>
              <div className="intro-block intro-did-you-know-block">
                <p className="intro-did-you-know">
                  <strong>Did you know?</strong> This pre-audit takes about two minutes. Your answers help map where your operations are today, and where they could be.
                </p>
              </div>
            </div>
          ) : (
            <>
          <section className="audit-card">
            <div key={step} className="audit-card-content">
            {step === "q1" && (
              <>
                <h3>How would you describe your current operations setup?</h3>
                <div className="options">
                  {[
                    "Mostly manual, heavy human involvement",
                    "Some systems in place, but they don’t talk to each other",
                    "Fairly automated, but fragile or inconsistent",
                    "Custom systems already in place",
                    "Not sure",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q1 === opt ? "option selected" : "option"
                      }
                      onClick={() => {
                        if (Date.now() < blockQ1ClicksUntilRef.current) return;
                        setAnswers((prev) => ({ ...prev, q1: opt }));
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "q2" && (
              <>
                <h3>
                  Which areas of your business feel the most inefficient right
                  now?
                </h3>
                <p className="hint">(Select up to 3)</p>
                <div className="options">
                  {inefficiencyOptions.map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q2.includes(opt) ? "option selected" : "option"
                      }
                      onClick={() => handleMultiToggle(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {errors && <p className="error">{errors}</p>}
              </>
            )}

            {step === "q3" && (
              <>
                <h3>
                  Do you currently rely on any custom tools or internal
                  software?
                </h3>
                <div className="options">
                  {[
                    "No, mostly off-the-shelf tools",
                    "Some custom logic (spreadsheets, scripts, automations)",
                    "Yes, internal tools or custom software",
                    "We’re currently building something",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q3 === opt ? "option selected" : "option"
                      }
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, q3: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "q4" && (
              <>
                <h3>
                  How important is accurate pricing or quoting to your business?
                </h3>
                <div className="options">
                  {[
                    "Critical. Pricing mistakes cost us real money.",
                    "Important, but mostly manual today",
                    "Somewhat important",
                    "Not relevant",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q4 === opt ? "option selected" : "option"
                      }
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, q4: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "q5" && (
              <>
                <h3>
                  When something breaks or needs improvement, how is it usually
                  handled?
                </h3>
                <div className="options">
                  {[
                    "We patch it manually",
                    "We rely on outside vendors",
                    "We have internal technical help",
                    "We usually leave it as-is",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q5 === opt ? "option selected" : "option"
                      }
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, q5: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "q6" && (
              <>
                <h3>
                  If the right system existed, what would you want it to do?
                </h3>
                <p className="hint">(Optional)</p>
                <textarea
                  value={answers.q6}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, q6: e.target.value }))
                  }
                  placeholder="Ex: automate quoting, centralize data, reduce admin work, improve customer experience…"
                />
              </>
            )}

            {step === "q7" && (
              <>
                <h3>
                  Are you open to investing in custom systems if there is clear
                  ROI?
                </h3>
                <div className="options">
                  {["Yes", "Possibly, depending on scope", "Not at this time"].map(
                    (opt) => (
                      <button
                        key={opt}
                        className={
                          answers.q7 === opt ? "option selected" : "option"
                        }
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, q7: opt }))
                        }
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
              </>
            )}

            {step === "q8" && (
              <>
                <h3>Roughly how big is your company today?</h3>
                <div className="options">
                  {[
                    "1–5 people",
                    "6–15 people",
                    "16–50 people",
                    "50+ people",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q8 === opt ? "option selected" : "option"
                      }
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, q8: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "q9" && (
              <>
                <h3>
                  To help us understand scope, what revenue range best describes
                  your business today?
                </h3>
                <div className="options">
                  {[
                    "Under $250k",
                    "$250k–$1M",
                    "$1M–$5M",
                    "$5M–$10M",
                    "$10M+",
                    "Prefer not to answer",
                  ].map((opt) => (
                    <button
                      key={opt}
                      className={
                        answers.q9 === opt ? "option selected" : "option"
                      }
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, q9: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "results" && (
              <>
                <h3>Here’s what we’re seeing so far</h3>
                <p>
                  Based on your answers, parts of your operations rely heavily
                  on people rather than systems. That usually shows up as extra
                  admin work, handoff issues, or things breaking when volume
                  increases.
                </p>
                <p>
                  We’ll review this in more detail on our side and send a short
                  summary to your email, so you can see where custom systems or
                  automation may actually be worth exploring.
                </p>
              </>
            )}

            {step === "contact" && (
              <div className="contact-step-inner">
                <h3>Your results are ready!</h3>
                <p className="lead-line">
                  Enter your details to unlock your full pre-audit results.
                </p>

                <div className="results-preview">
                  <span className="results-preview-label">Preview</span>
                  <div className="results-preview-content">
                    <div className="results-preview-report">
                      <div className="results-preview-report-title">
                        Operations &amp; Systems Pre-Audit
                      </div>
                      <div className="results-preview-metrics">
                        <span className="results-preview-kpi">12 hrs/wk</span>
                        <span className="results-preview-kpi">3 tools</span>
                        <span className="results-preview-kpi">78%</span>
                      </div>
                      <div className="results-preview-chart">
                        <div className="results-preview-bar" style={{ width: "70%" }} />
                        <div className="results-preview-bar" style={{ width: "45%" }} />
                        <div className="results-preview-bar" style={{ width: "90%" }} />
                        <div className="results-preview-bar" style={{ width: "55%" }} />
                      </div>
                      <div className="results-preview-finding">
                        Manual handoffs · Scattered data · Automation potential
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label>
                    First name<span className="required">*</span>
                  </label>
                  <input
                    value={contact.firstName}
                    onChange={(e) =>
                      setContact((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className={`field ${contact.email && !isValidEmail(contact.email) ? "field-invalid" : ""}`}>
                  <label>
                    Business email<span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      setContact((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                  {contact.email && !isValidEmail(contact.email) && (
                    <span className="field-error">Enter a valid email address</span>
                  )}
                </div>
                <div className={`field ${contact.phone && !isValidPhone(contact.phone) ? "field-invalid" : ""}`}>
                  <label>
                    Phone number<span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(555) 123-4567"
                    value={contact.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneDisplay(e.target.value);
                      setContact((prev) => ({ ...prev, phone: formatted }));
                    }}
                  />
                  {contact.phone && !isValidPhone(contact.phone) && (
                    <span className="field-error">Enter a valid 10-digit phone number</span>
                  )}
                </div>
                <div className="field">
                  <label>Company name (optional)</label>
                  <input
                    value={contact.company}
                    onChange={(e) =>
                      setContact((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field checkbox-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      I understand Clonet may reach out to discuss these results.
                    </span>
                  </label>
                </div>
                {errors && <p className="error">{errors}</p>}
              </div>
            )}

            {step === "final" && (
              <>
                <h3>Confirmation sent</h3>
                <p>
                  A team of experts will review your pre-audit and send you a
                  breakdown of your results. We’ll be in touch at the email you
                  provided.
                </p>
              </>
            )}

            {step === "done" && (
              <>
                <h3>Thank you</h3>
                <p>
                  Thanks for completing the pre-audit. Our team will review your
                  responses and send you a breakdown of your results shortly.
                </p>
              </>
            )}
            </div>
          </section>

          {/* footer navigation: hidden on intro, loading, done */}
          {step !== "done" && (
            <footer className={step === "contact" || step === "final" ? "audit-footer audit-footer-contact" : "audit-footer"}>
              <div className="footer-left">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    if (step === "q1") {
                      setStep("intro");
                    } else if (step === "q2") {
                      setStep("q1");
                    } else if (step === "q3") {
                      setStep("q2");
                    } else if (step === "q4") {
                      setStep("q3");
                    } else if (step === "q5") {
                      setStep("q4");
                    } else if (step === "q6") {
                      setStep("q5");
                    } else if (step === "q7") {
                      setStep("q6");
                    } else if (step === "q8") {
                      setStep("q7");
                    } else if (step === "q9") {
                      setStep("q8");
                    } else if (step === "results") {
                      setStep("q9");
                    } else if (step === "contact") {
                      setStep("q9");
                    } else if (step === "final") {
                      setStep("contact");
                    }
                  }}
                >
                  Previous
                </button>
              </div>
              <div className="footer-right">
                {step !== "contact" && step !== "final" && (
                  <button
                    className="skip-text"
                    type="button"
                    onClick={() => {
                      if (step === "q1") setStep("q2");
                      else if (step === "q2") setStep("q3");
                      else if (step === "q3") setStep("q4");
                      else if (step === "q4") setStep("q5");
                      else if (step === "q5") setStep("q6");
                      else if (step === "q6") setStep("q7");
                      else if (step === "q7") setStep("q8");
                      else if (step === "q8") setStep("q9");
                      else if (step === "q9") setStep("loading");
                      else if (step === "results") setStep("contact");
                      else if (step === "contact") setStep("final");
                    }}
                  >
                    Skip
                  </button>
                )}
                <div className="footer-primary">
                  <button
                    type="button"
                    className={step === "contact" || step === "final" ? "primary-filled" : undefined}
                    disabled={!canGoNext || submitting}
                    onClick={() => {
                      if (step === "q1") {
                        setStep("q2");
                      } else if (step === "q2") setStep("q3");
                      else if (step === "q3") setStep("q4");
                      else if (step === "q4") setStep("q5");
                      else if (step === "q5") setStep("q6");
                      else if (step === "q6") setStep("q7");
                      else if (step === "q7") setStep("q8");
                      else if (step === "q8") setStep("q9");
                      else if (step === "q9") setStep("loading");
                      else if (step === "results") setStep("contact");
                      else if (step === "contact") handleSubmit();
                      else if (step === "final") setStep("done");
                    }}
                  >
                    {step === "contact"
                      ? "Unlock Results"
                      : step === "final"
                      ? "Done"
                      : "Next"}
                  </button>
                </div>
              </div>
            </footer>
          )}
            </>
          )}
          {step === "intro" && (
            <footer className="audit-footer intro-footer" />
          )}
        </main>
        {step === "intro" && (
          <footer className="site-footer">
            <span>© 2026 Clonet</span>
          </footer>
        )}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
};

const styles = `
  ::selection {
    background: rgba(255, 87, 0, 0.25);
    color: #f5f5f5;
  }
  .confetti-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 30;
    overflow: hidden;
  }
  .confetti-piece {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 8px;
    height: 4px;
    margin-left: -4px;
    margin-top: -2px;
    border-radius: 1px;
    opacity: 0;
    animation: confetti-pop 1.15s ease-out forwards;
  }
  @keyframes confetti-pop {
    0% {
      transform: translate(-50%, -50%) rotate(var(--angle, 0deg)) scale(0);
      opacity: 1;
    }
    25% {
      opacity: 1;
    }
    100% {
      transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% + var(--dy, 0px))) rotate(var(--angle, 0deg)) scale(1);
      opacity: 0;
    }
  }
  .exit-confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .exit-confirm-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    cursor: pointer;
  }
  .exit-confirm-card {
    position: relative;
    width: 100%;
    max-width: 380px;
    padding: 28px 24px;
    border-radius: 12px;
    border: 1px solid #505050;
    background: #080808;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  }
  .exit-confirm-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: #f5f5f5;
  }
  .exit-confirm-message {
    margin: 0 0 24px;
    font-size: 15px;
    color: #9ca3af;
  }
  .exit-confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  .exit-confirm-cancel {
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid #606060;
    background: transparent;
    color: #d4d4d4;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .exit-confirm-cancel:hover {
    background: #0d0d0d;
    border-color: #707070;
    color: #f5f5f5;
  }
  .exit-confirm-exit {
    padding: 10px 18px;
    border-radius: 8px;
    border: none;
    background: linear-gradient(180deg, #ff5905 0%, #ff5700 50%, #ff5500 100%);
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 87, 0, 0.3);
    transition: opacity 0.15s ease, box-shadow 0.15s ease;
  }
  .exit-confirm-exit:hover {
    opacity: 0.97;
    box-shadow: 0 2px 10px rgba(255, 87, 0, 0.3);
  }
  .audit-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000000;
    background-image: radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 50%);
    padding: 32px 24px 40px;
    color: #f5f5f5;
    font-family: "Undefined Medium", "Inter Tight", ui-monospace, monospace;
    position: relative;
  }
  .audit-frame {
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
  }
  .audit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    position: relative;
  }
  .header-left {
    width: 80px;
  }
  .header-left-intro {
    width: auto;
    display: flex;
    align-items: center;
  }
  .header-center {
    display: flex;
    justify-content: center;
    flex: 1;
  }
  .header-right {
    min-width: 110px;
    text-align: right;
    font-size: 14px;
    color: #9ca3af;
  }
  .step-label {
    white-space: nowrap;
  }
  @media (max-width: 768px) {
    .audit-header {
      min-height: 56px;
    }
    .header-center {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }
    .header-center .logo-img {
      pointer-events: auto;
    }
    .header-left,
    .header-right {
      position: relative;
      z-index: 1;
    }
    .step-label {
      font-size: 11px;
    }
  }
  .exit-global {
    position: fixed;
    top: 18px;
    right: 26px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid #606060;
    background: rgba(8, 8, 8, 0.95);
    color: #d4d4d4;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    z-index: 20;
  }
  .exit-global:hover {
    background: rgba(13, 13, 13, 0.98);
    border-color: #707070;
    color: #f5f5f5;
  }
  .logo-img {
    height: 80px;
    width: auto;
  }
  .logo-img-intro {
    position: fixed;
    top: 18px;
    left: 26px;
    height: 40px;
    z-index: 20;
    animation: logoFade 0.6s ease-out;
  }
  .progress-row {
    margin: 12px 0 28px;
  }
  .progress-track {
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: #0d0d0d;
    box-shadow: inset 0 0 0 1px #505050;
    overflow: hidden;
    position: relative;
  }
  .progress-bar {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #ff7a1a 0%, #ff5700 50%, #ff9b4a 100%);
    box-shadow: 0 0 12px rgba(255, 87, 0, 0.45);
    transition: width 0.25s ease-out;
    position: relative;
    overflow: hidden;
  }
  .progress-bar::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.02) 40%,
      rgba(255, 255, 255, 0.18) 80%
    );
    background-size: 48px 48px;
    mix-blend-mode: screen;
    opacity: 0.45;
    animation: progress-shimmer 1.15s linear infinite;
  }
  .audit-main {
    background: #080808;
    border-radius: 16px;
    border: 1px solid #505050;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    padding: 20px 16px 16px;
  }
  .intro-main {
    max-width: none;
    width: 100%;
    margin: 0;
    padding: 24px 20px 32px;
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
  .audit-card {
    max-width: 560px;
    margin: 0 auto;
    text-align: center;
  }
  .intro-fullpage {
    position: relative;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    min-height: 60vh;
  }
  .intro-orange-glow {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    background: radial-gradient(
      ellipse 120% 90% at 110% -15%,
      rgba(255, 87, 0, 0.08) 0%,
      rgba(255, 140, 80, 0.045) 25%,
      rgba(255, 255, 255, 0.035) 45%,
      rgba(220, 220, 220, 0.018) 60%,
      transparent 75%
    );
  }
  .intro-orange-glow::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px 180px;
    opacity: 0.2;
    mix-blend-mode: overlay;
  }
  .audit-frame-intro {
    position: relative;
    z-index: 1;
  }
  .audit-frame {
    position: relative;
    z-index: 1;
  }
  .page-orange-glow {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .page-orange-glow::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px 180px;
    opacity: 0.2;
    mix-blend-mode: overlay;
  }
  .page-orange-glow-center {
    background: radial-gradient(
      ellipse 120% 90% at 50% -15%,
      rgba(255, 87, 0, 0.08) 0%,
      rgba(255, 140, 80, 0.045) 25%,
      rgba(255, 255, 255, 0.035) 45%,
      rgba(220, 220, 220, 0.018) 60%,
      transparent 75%
    );
  }
  .intro-block {
    position: relative;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(10px);
    animation: introBlockReveal 0.6s ease-out forwards;
  }
  .intro-head-block {
    max-width: 520px;
    margin-right: auto;
    margin-bottom: 48px;
    animation-delay: 0.05s;
  }
  .intro-analogy-block {
    animation-delay: 0.2s;
  }
  .intro-stat-block {
    animation-delay: 0.35s;
  }
  .intro-did-you-know-block {
    animation-delay: 0.5s;
  }
  .intro-cta-wrap {
    margin-top: 24px;
  }
  .intro-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
    margin: 0 0 10px;
  }
  .intro-headline {
    font-size: 28px;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
    font-weight: 600;
    color: #f5f5f5;
    line-height: 1.2;
    position: relative;
    display: inline-block;
  }
  .intro-headline::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent);
  }
  .intro-lead {
    margin: 0;
    color: #d4d4d4;
    line-height: 1.55;
    font-size: 16px;
  }
  .intro-analogy-block {
    max-width: 480px;
    margin-left: auto;
    margin-right: 0;
    padding: 24px 0;
    border-top: 1px solid #505050;
  }
  .intro-analogy-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
    margin: 0 0 12px;
  }
  .intro-analogy-text {
    margin: 0;
    font-size: 15px;
    color: #d4d4d4;
    line-height: 1.6;
  }
  .intro-stat-block {
    max-width: 380px;
    margin-left: 0;
    margin-right: auto;
    padding: 20px 0;
  }
  .intro-stat {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .intro-stat-num {
    font-size: 36px;
    font-weight: 600;
    color: #f5f5f5;
    letter-spacing: -0.02em;
  }
  .intro-stat-label {
    font-size: 14px;
    color: #9ca3af;
    line-height: 1.45;
  }
  .intro-did-you-know-block {
    max-width: 440px;
    margin-left: auto;
    margin-right: 12%;
    padding: 24px 0;
    border-top: 1px solid #505050;
  }
  .intro-did-you-know {
    margin: 0;
    font-size: 14px;
    color: #9ca3af;
    line-height: 1.5;
  }
  .intro-did-you-know strong {
    color: #d4d4d4;
    font-weight: 600;
  }
  .intro-cta {
    min-width: 140px;
    padding: 12px 24px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.02em;
    background: #ffffff;
    border: none;
    color: #0d0d0d;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.15s ease;
  }
  .intro-cta:hover {
    opacity: 0.92;
  }
  .intro-cta:active {
    transform: scale(0.98);
  }
  .intro-cta:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }
  .audit-card-content {
    animation: cardReveal 0.4s ease-out;
  }
  .site-footer {
    margin-top: 48px;
    padding-bottom: 24px;
    font-size: 13px;
    color: #9ca3af;
    text-align: center;
  }
  h2 {
    font-size: 26px;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
    font-weight: 600;
    color: #f5f5f5;
  }
  h3 {
    font-size: 20px;
    margin-bottom: 20px;
    font-weight: 500;
    color: #f5f5f5;
  }
  p {
    max-width: 640px;
    margin: 0 0 16px;
    color: #d4d4d4;
    line-height: 1.5;
    font-size: 16px;
  }
  .hint {
    font-size: 15px;
    color: #9ca3af;
    margin-top: -8px;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 22px 0 8px;
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
  }
  .option {
    text-align: left;
    border-radius: 10px;
    padding: 14px 20px;
    border: 1px solid #606060;
    background: #0d0d0d;
    color: #e5e5e5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 15px;
    font-weight: 400;
    transform: translateZ(0);
  }
  .option:hover {
    border-color: #ff5700;
    background: rgba(255, 87, 0, 0.1);
  }
  .option:active {
    transform: scale(0.98);
  }
  .options .option {
    opacity: 0;
    animation: optionReveal 0.4s ease-out forwards;
  }
  .options .option:nth-child(1) { animation-delay: 0.03s; }
  .options .option:nth-child(2) { animation-delay: 0.06s; }
  .options .option:nth-child(3) { animation-delay: 0.09s; }
  .options .option:nth-child(4) { animation-delay: 0.12s; }
  .options .option:nth-child(5) { animation-delay: 0.15s; }
  .options .option:nth-child(6) { animation-delay: 0.18s; }
  .options .option:nth-child(7) { animation-delay: 0.21s; }
  .options .option:nth-child(8) { animation-delay: 0.24s; }
  .options .option:nth-child(9) { animation-delay: 0.27s; }
  .option.selected {
    border-color: #ff5700;
    background: rgba(255, 87, 0, 0.12);
    color: #f5f5f5;
    font-weight: 500;
  }
  button {
    border: none;
    cursor: pointer;
  }
  .card-footer-centered {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }
  .card-footer-centered button {
    min-width: 160px;
    padding: 13px 22px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    background: transparent;
    border: 1px solid #ff5700;
    color: #ff5700;
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }
  .card-footer-centered button:active {
    transform: scale(0.98);
  }
  .card-footer-centered button:focus-visible,
  .audit-footer button:focus-visible,
  .option:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 87, 0, 0.4);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
    width: 400px;
    max-width: 100%;
    text-align: left;
    margin-left: auto;
    margin-right: auto;
  }
  label {
    font-size: 14px;
    color: #d4d4d4;
  }
  .required {
    color: #f87171;
    margin-left: 2px;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    border-radius: 8px;
    padding: 9px 12px;
    border: 1px solid #606060;
    background: #0d0d0d;
    color: #f5f5f5;
    font-size: 15px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  input:focus {
    outline: none;
    border-color: rgba(255, 87, 0, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 87, 0, 0.12);
  }
  textarea {
    width: 100%;
    min-height: 96px;
    border-radius: 8px;
    padding: 10px 12px;
    background: #0d0d0d;
    border: 1px solid #606060;
    color: #f5f5f5;
    font-size: 14px;
    resize: vertical;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  textarea:focus {
    outline: none;
    border-color: rgba(255, 87, 0, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 87, 0, 0.12);
  }
  textarea::placeholder {
    color: #6b7280;
  }
  .micro {
    font-size: 14px;
    color: #9ca3af;
    margin-top: 4px;
  }
  .lead-line {
    font-size: 15px;
    color: #9ca3af;
    margin: -4px 0 10px;
  }
  .contact-step-inner {
    width: 480px;
    max-width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    box-sizing: border-box;
  }
  .contact-step-inner h3,
  .contact-step-inner .lead-line {
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }
  .contact-step-inner .results-preview {
    width: 100%;
    max-width: none;
    margin-left: 0;
    margin-right: 0;
    margin-top: 4px;
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  .contact-step-inner .field {
    width: 100%;
    max-width: none;
    margin-left: 0;
    margin-right: 0;
    box-sizing: border-box;
    text-align: left;
  }
  .contact-step-inner .error {
    text-align: center;
  }
  .results-preview {
    max-width: 560px;
    margin: 10px auto 16px;
    padding: 12px 16px;
    border-radius: 14px;
    border: 1px solid #505050;
    background: radial-gradient(circle at top, #0d0d0d, #080808);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    position: relative;
    overflow: hidden;
  }
  .results-preview-label {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 4px;
  }
  .results-preview-content {
    font-size: 13px;
    color: #9ca3af;
    opacity: 0.85;
    filter: blur(3px);
  }
  .results-preview-report {
    padding: 0;
  }
  .results-preview-report-title {
    font-size: 11px;
    font-weight: 600;
    color: #f5f5f5;
    letter-spacing: 0.02em;
    margin-bottom: 5px;
    padding-bottom: 4px;
    border-bottom: 1px solid #555555;
  }
  .results-preview-metrics {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }
  .results-preview-kpi {
    font-size: 10px;
    font-weight: 600;
    color: #ff5700;
    padding: 3px 6px;
    background: rgba(255, 87, 0, 0.12);
    border-radius: 4px;
  }
  .results-preview-chart {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 5px;
  }
  .results-preview-bar {
    height: 5px;
    min-width: 20%;
    background: linear-gradient(90deg, #ff5700 0%, #ff9b4a 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .results-preview-finding {
    font-size: 10px;
    color: #9ca3af;
    line-height: 1.3;
  }
  .results-preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 60%);
    pointer-events: none;
  }
  .checkbox-field {
    margin-top: 8px;
  }
  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: #9ca3af;
  }
  .checkbox-label input[type="checkbox"] {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid #606060;
    background: #0d0d0d;
    accent-color: #ff5700;
  }
  .error {
    margin-top: 8px;
    font-size: 15px;
    color: #f87171;
  }
  .field-error {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    color: #f87171;
  }
  .field-invalid input {
    border-color: #f87171;
    box-shadow: 0 0 0 1px #f87171;
  }
  .field-invalid input:focus {
    outline: none;
    border-color: #f87171;
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.3);
  }
  .audit-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
  }
  .audit-footer-contact {
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }
  .footer-left,
  .footer-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .footer-right {
    margin-left: auto;
  }
  .footer-primary {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .skip-text {
    background: transparent !important;
    border: none !important;
    min-width: auto !important;
    padding: 0 8px 0 0 !important;
    border-radius: 0 !important;
    font-size: 15px;
    font-weight: 500;
    color: #9ca3af !important;
    text-decoration: underline;
    box-shadow: none;
    display: inline-block;
  }
  .audit-footer button {
    min-width: 140px;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  .audit-footer button:active {
    transform: scale(0.98);
  }
  .audit-footer button.secondary {
    background: #0d0d0d;
    border: 1px solid #606060;
    color: #d4d4d4;
  }
  .audit-footer button:not(.secondary) {
    background: transparent;
    border: 1px solid #ff5700;
    color: #ff5700;
  }
  .audit-footer button.primary-filled {
    background: rgba(255, 87, 0, 0.12);
    border-color: #ff5700;
    color: #ff5700;
  }
  .audit-footer.intro-footer {
    height: 0;
  }
  .audit-footer button:not(.secondary):hover,
  .card-footer-centered button:hover {
    background: rgba(255, 87, 0, 0.12);
    border-color: #ff5700;
    color: #ff5700;
  }
  .audit-footer button:disabled,
  .card-footer-centered button:disabled {
    border-color: #606060;
    color: #6b7280;
    cursor: not-allowed;
  }
  .reassure {
    font-size: 12px;
    color: #9ca3af;
  }
  .loading-fullscreen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000000;
    background-image: radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 50%);
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
  }
  .loading-wrap {
    padding: 32px 24px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    text-align: center;
    width: 100%;
    max-width: 360px;
    box-sizing: border-box;
  }
  .loading-wrap-standalone {
    padding: 24px;
    gap: 32px;
  }
  .loading-copy {
    margin: 0;
    font-size: 15px;
    color: #9ca3af;
    text-align: center;
    width: 100%;
  }
  .pixel-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    width: min-content;
  }
  .pixel-grid-large {
    gap: 12px;
  }
  .pixel-grid-large .pixel {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }
  .pixel {
    width: 14px;
    height: 14px;
    background: #404040;
    border-radius: 2px;
    animation: pixel-pulse 1.2s ease-in-out infinite;
  }
  .pixel:nth-child(1) { animation-delay: 0s; }
  .pixel:nth-child(2) { animation-delay: 0.06s; }
  .pixel:nth-child(3) { animation-delay: 0.12s; }
  .pixel:nth-child(4) { animation-delay: 0.18s; }
  .pixel:nth-child(5) { animation-delay: 0.24s; }
  .pixel:nth-child(6) { animation-delay: 0.06s; }
  .pixel:nth-child(7) { animation-delay: 0.12s; }
  .pixel:nth-child(8) { animation-delay: 0.18s; }
  .pixel:nth-child(9) { animation-delay: 0.24s; }
  .pixel:nth-child(10) { animation-delay: 0.3s; }
  .pixel:nth-child(11) { animation-delay: 0.12s; }
  .pixel:nth-child(12) { animation-delay: 0.18s; }
  .pixel:nth-child(13) { animation-delay: 0.24s; }
  .pixel:nth-child(14) { animation-delay: 0.3s; }
  .pixel:nth-child(15) { animation-delay: 0.36s; }
  .pixel:nth-child(16) { animation-delay: 0.18s; }
  .pixel:nth-child(17) { animation-delay: 0.24s; }
  .pixel:nth-child(18) { animation-delay: 0.3s; }
  .pixel:nth-child(19) { animation-delay: 0.36s; }
  .pixel:nth-child(20) { animation-delay: 0.42s; }
  .pixel:nth-child(21) { animation-delay: 0.24s; }
  .pixel:nth-child(22) { animation-delay: 0.3s; }
  .pixel:nth-child(23) { animation-delay: 0.36s; }
  .pixel:nth-child(24) { animation-delay: 0.42s; }
  .pixel:nth-child(25) { animation-delay: 0.48s; }
  @keyframes pixel-pulse {
    0%, 100% { background: #404040; opacity: 0.6; }
    50% { background: #ff5700; opacity: 1; box-shadow: 0 0 10px rgba(255, 87, 0, 0.5); }
  }
  @keyframes progress-shimmer {
    0% {
      background-position: -48px 0;
    }
    100% {
      background-position: 48px 0;
    }
  }
  @keyframes cardReveal {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes optionReveal {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes logoFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes introBlockReveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes introLineFade {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes introDotPulse {
    0%, 100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.15);
    }
  }
  @media (max-width: 768px) {
    .audit-shell {
      padding: 16px 12px 24px;
    }
    .audit-frame {
      max-width: 100%;
    }
    .audit-main {
      padding: 20px 16px 16px;
      border-radius: 16px;
    }
    .audit-main {
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }
    .intro-fullpage {
      padding: 0;
    }
    .intro-head-block,
    .intro-analogy-block,
    .intro-stat-block,
    .intro-did-you-know-block {
      max-width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
    .intro-did-you-know-block {
      margin-right: 0;
    }
    .intro-headline {
      font-size: 22px;
    }
    h2 {
      font-size: 22px;
    }
    h3 {
      font-size: 20px;
    }
    .options {
      max-width: 100%;
    }
    .audit-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .footer-left,
    .footer-right {
      justify-content: space-between;
    }
    .footer-right {
      margin-left: 0;
      justify-content: flex-end;
    }
    .audit-footer button {
      width: 100%;
    }
    .skip-text {
      padding-right: 12px !important;
    }
  }
`;

