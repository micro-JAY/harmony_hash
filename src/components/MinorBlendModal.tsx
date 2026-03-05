import { useEffect } from "react";
import { motion } from "framer-motion";

interface MinorBlendModalProps {
  onClose: () => void;
}

export default function MinorBlendModal({ onClose }: MinorBlendModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        style={{
          position: "relative",
          maxWidth: "640px",
          width: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
          backgroundColor: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close minor blend help"
          style={{
            position: "absolute",
            top: "var(--space-4)",
            right: "var(--space-4)",
            width: "28px",
            height: "28px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface-overlay)",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            transition: "all var(--duration-normal) var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-accent)";
            e.currentTarget.style.borderColor = "var(--interactive-accent-border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}
        >
          ×
        </button>

        <header style={{ marginBottom: "var(--space-4)", paddingRight: "var(--space-8)" }}>
          <h1
            style={{
              color: "var(--text-accent)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-semibold)",
              marginBottom: "var(--space-2)",
            }}
          >
            Why is my Minor Chord different?
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
            }}
          >
            A Guide to "The Minor Blend"
          </p>
        </header>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          If you're using Harmony Hash and you notice a chord in a minor progression feels
          "brighter" or has a note that isn't in your starting scale, don't worry — it's not a
          bug. It's the secret to professional songwriting.
        </p>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          In most modern music (R&amp;B, Jazz, Neo-Soul), we don't stick to just one "Minor Scale."
          Instead, we treat Minor as a <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>blend</strong> of three different flavors to get the best
          results.
        </p>

        <hr style={{ borderColor: "var(--border-subtle)", margin: "var(--space-6) 0" }} />

        <h2
          style={{
            color: "var(--text-accent)",
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            marginBottom: "var(--space-3)",
            marginTop: "var(--space-1)",
          }}
        >
          1. The Three Flavors of Minor
        </h2>

        <ul style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          <li style={{ marginBottom: "var(--space-3)" }}>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Natural Minor (The Vibe):</strong> This is the "default" minor. It sounds cold, somber, and looped.
            It's great for the "background" of a song.
          </li>
          <li style={{ marginBottom: "var(--space-3)" }}>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Harmonic Minor (The Pull):</strong> This version raises the 7th note of the scale. It creates a Major V chord,
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}> which acts like a magnet,</strong> pulling the listener's ear back to the "Home" chord (i).
          </li>
          <li>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Melodic Minor (The Sophisticate):</strong> This raises even more notes to make the melody sound smoother and "jazzier."
          </li>
        </ul>

        <hr style={{ borderColor: "var(--border-subtle)", margin: "var(--space-6) 0" }} />

        <h2
          style={{
            color: "var(--text-accent)",
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            marginBottom: "var(--space-3)",
            marginTop: "var(--space-1)",
          }}
        >
          2. Why do we blend them?
        </h2>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          If we stayed strictly in Natural Minor, <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>your "V" chord would be minor (v).</strong> While that sounds okay, it
          lacks "energy." It doesn't tell the listener, "Hey, we're about to start the loop over!"
        </p>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          By <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>blending</strong> in a note from the Harmonic Minor, <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>we change that v
          to a V (Major).</strong>
        </p>

        <ul style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          <li>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>The Result:</strong> The progression feels more "expensive" and professional. It adds a touch of drama
            that makes the resolution feel much more satisfying.
          </li>
        </ul>

        <hr style={{ borderColor: "var(--border-subtle)", margin: "var(--space-6) 0" }} />

        <h2
          style={{
            color: "var(--text-accent)",
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            marginBottom: "var(--space-3)",
            marginTop: "var(--space-1)",
          }}
        >
          3. What to tell your ears
        </h2>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          When you stumble across a "Major" chord in a "Minor" progression:
        </p>

        <ol style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          <li style={{ marginBottom: "var(--space-3)" }}>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Look for the "leading tone":</strong> That bright note is usually just a half-step away from your Home
            note. It's a "guide" for your ear.
          </li>
          <li>
            <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Feel the Tension:</strong> That chord is there to create a "question." The next chord (the i minor)
            is the "answer."
          </li>
        </ol>

        <hr style={{ borderColor: "var(--border-subtle)", margin: "var(--space-6) 0" }} />

        <h2
          style={{
            color: "var(--text-accent)",
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            marginBottom: "var(--space-3)",
            marginTop: "var(--space-1)",
          }}
        >
          Summary for Harmony Hash
        </h2>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-4)",
          }}
        >
          We've pre-blended these progressions so you don't have to worry about the math. We use
          Natural Minor <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>for the atmosphere</strong> and Harmonic/Melodic Minor <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>for the "hooks"
          and the "resolutions."</strong>
        </p>

        <p
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>It's the difference between a simple loop and a composition.</strong>
        </p>

        <hr style={{ borderColor: "var(--border-subtle)", margin: "var(--space-6) 0" }} />

        <blockquote
          style={{
            borderLeft: "3px solid var(--text-accent)",
            paddingLeft: "var(--space-4)",
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          Pro Tip: If you see an <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontStyle: "normal" }}>E7</strong> in an <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontStyle: "normal" }}>Am</strong> progression,
          that's the "Magnetic Pull" in action!
        </blockquote>
      </motion.div>
    </div>
  );
}
