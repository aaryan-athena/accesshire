import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, X } from "lucide-react";

const VoiceAssistant = () => {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || !active && !listening) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    setCurrentMessage(text);
    window.speechSynthesis.speak(utterance);
  }, [active, listening]);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const activateAssistant = useCallback(() => {
    setActive(true);
    setListening(false);
    setShowPopup(false);
    setDismissed(false);
  }, []);

  const deactivateAssistant = useCallback(() => {
    stopSpeaking();
    setActive(false);
    setDismissed(true);
    setShowPopup(false);
  }, [stopSpeaking]);

  // Auto-activate popup on mount
  useEffect(() => {
    if (dismissed) return;

    const timer = setTimeout(() => {
      speak("Welcome to AccessHire. Press the spacebar to continue with voice assistance, or close this popup.");
    }, 1000);

    const dismissTimer = setTimeout(() => {
      if (!active) {
        stopSpeaking();
        setListening(false);
        setShowPopup(false);
        setDismissed(true);
      }
    }, 11000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
      stopSpeaking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for spacebar to activate
  useEffect(() => {
    if (!listening || dismissed || active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !active) {
        e.preventDefault();
        activateAssistant();
        // Small delay so active state is set before speak checks it
        setTimeout(() => {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(
              "Voice assistant activated. I will describe elements as you hover over them. Use keyboard navigation to explore the site. Click the speaker icon at the bottom right to toggle me on or off."
            );
            utterance.rate = 0.95;
            utterance.onstart = () => setSpeaking(true);
            utterance.onend = () => setSpeaking(false);
            setCurrentMessage("Voice assistant activated. Hover over elements to hear descriptions.");
            window.speechSynthesis.speak(utterance);
          }
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listening, dismissed, active, activateAssistant]);

  // Escape to dismiss
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        deactivateAssistant();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, deactivateAssistant]);

  // Hover-to-speak: read accessible labels of hovered interactive elements
  useEffect(() => {
    if (!active) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest("a, button, [role='button'], input, select, textarea, [tabindex]");
      if (!interactive) return;

      const el = interactive as HTMLElement;
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent?.trim();

      if (!label || label.length > 200) return;

      // Small delay to avoid speaking on quick mouse passes
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        const tagName = el.tagName.toLowerCase();
        const role = el.getAttribute("role");
        let prefix = "";
        if (tagName === "a" || role === "link") prefix = "Link: ";
        else if (tagName === "button" || role === "button") prefix = "Button: ";
        else if (tagName === "input") prefix = `Input field: ${el.getAttribute("placeholder") || ""}. `;
        else if (tagName === "select") prefix = "Dropdown: ";

        const text = `${prefix}${label}`;
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          setCurrentMessage(text);
          window.speechSynthesis.speak(utterance);
        }
      }, 250);
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    document.addEventListener("mouseover", handleMouseEnter);
    document.addEventListener("mouseout", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [active]);

  // Focus-to-speak for keyboard nav
  useEffect(() => {
    if (!active) return;

    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent?.trim();

      if (!label || label.length > 200) return;

      const tagName = el.tagName.toLowerCase();
      let prefix = "";
      if (tagName === "a") prefix = "Link: ";
      else if (tagName === "button") prefix = "Button: ";
      else if (tagName === "input") prefix = `Input: ${el.getAttribute("placeholder") || ""}. `;

      const text = `${prefix}${label}`;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        setCurrentMessage(text);
        window.speechSynthesis.speak(utterance);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, [active]);

  return (
    <>
      {/* Initial popup prompt */}
      {showPopup && !active && listening && !dismissed && (
        <div
          role="alertdialog"
          aria-live="assertive"
          aria-label="Voice Assistant Prompt"
          className="fixed bottom-20 right-6 z-[100] max-w-sm"
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-lg relative">
            {/* Close button */}
            <button
              onClick={() => {
                stopSpeaking();
                setShowPopup(false);
                setListening(false);
                setDismissed(true);
              }}
              className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Close voice assistant"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${speaking ? "bg-primary animate-pulse" : "bg-primary/10"}`}>
                <Volume2 className={`h-5 w-5 ${speaking ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Voice Assistant</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Press <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> to activate voice guidance
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary animate-[shrink_10s_linear_forwards]" />
              </div>
              <span className="text-[10px] text-muted-foreground">10s</span>
            </div>
          </div>
        </div>
      )}

      {/* Active assistant status */}
      {active && currentMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-6 z-[100] max-w-sm"
        >
          <div className="rounded-2xl border border-border bg-card p-3 shadow-lg relative">
            <button
              onClick={deactivateAssistant}
              className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Close voice assistant"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 pr-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary animate-pulse">
                <Volume2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{currentMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating speaker toggle button */}
      <button
        onClick={() => {
          if (active) {
            deactivateAssistant();
          } else {
            activateAssistant();
            setTimeout(() => {
              if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(
                  "Voice assistant enabled. Hover over buttons and links to hear their descriptions."
                );
                utterance.rate = 0.95;
                utterance.onstart = () => setSpeaking(true);
                utterance.onend = () => setSpeaking(false);
                setCurrentMessage("Voice assistant enabled. Hover over elements to hear descriptions.");
                window.speechSynthesis.speak(utterance);
              }
            }, 100);
          }
        }}
        className={`fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-muted-foreground hover:text-primary"
        }`}
        aria-label={active ? "Disable voice assistant" : "Enable voice assistant"}
        title={active ? "Disable voice assistant" : "Enable voice assistant"}
      >
        {active ? (
          <Volume2 className="h-6 w-6" />
        ) : (
          <VolumeX className="h-6 w-6" />
        )}
      </button>
    </>
  );
};

export default VoiceAssistant;
