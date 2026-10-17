"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const INTRO_DURATION = 3000;
const INTRO_FADE_DURATION = 400;

export default function HomeIntroExperience({ children }: { children: React.ReactNode }) {
  const [introVisible, setIntroVisible] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (introExiting) return;
    skipButton.current?.focus();
    const timer = window.setTimeout(() => {
      setIntroExiting(true);
    }, INTRO_DURATION - INTRO_FADE_DURATION);

    return () => window.clearTimeout(timer);
  }, [introExiting]);

  useEffect(() => {
    if (!introExiting) return;
    const timer = window.setTimeout(() => setIntroVisible(false), INTRO_FADE_DURATION);
    return () => window.clearTimeout(timer);
  }, [introExiting]);

  function skipIntro() {
    setIntroExiting(true);
  }

  return (
    <>
      <div className="home-cosmic-backdrop" aria-hidden="true">
        <span className="home-cosmic-glow" />
        <span className="home-cosmic-orbit">
          <span className="home-cosmic-satellite" />
        </span>
        <span className="home-cosmic-core" />
      </div>
      <div inert={introVisible}>{children}</div>
      {introVisible && (
        <div
          className="home-intro-overlay"
          data-exiting={introExiting}
          role="region"
          aria-labelledby="home-intro-title"
        >
          <div className="home-intro-stars" aria-hidden="true" />
          <button ref={skipButton} type="button" onClick={skipIntro} className="home-intro-skip">
            Skip intro <ArrowRight size={14} />
          </button>

          <div className="home-intro-content">
            <div className="home-earth-scene" aria-hidden="true">
              <span className="home-orbit home-orbit-one">
                <span className="home-orbit-satellite home-orbit-satellite-one" />
              </span>
              <span className="home-orbit home-orbit-two">
                <span className="home-orbit-satellite home-orbit-satellite-two" />
              </span>
              <span className="home-earth">
                <span className="home-earth-clouds" />
                <span className="home-earth-shine" />
              </span>
              <span className="home-earth-shadow" />
            </div>

            <div className="home-intro-copy">
              <p className="home-intro-kicker">
                <Sparkles size={13} />
                A portfolio by
              </p>
              <h1 id="home-intro-title" className="home-intro-title">Hom Sophorn</h1>
              <p className="home-intro-subtitle">SOFTWARE ENGINEER <span>·</span> CREATIVE DEVELOPER</p>

              <div className="home-intro-loading" role="status" aria-live="polite">
                <div className="home-intro-loading-copy">
                  <span>Preparing your experience</span>
                  <span className="home-intro-loading-dots" aria-hidden="true">•••</span>
                </div>
                <span className="home-intro-progress-track">
                  <span className="home-intro-progress" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
