import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "../i18n/I18nContext";

interface MinorBlendModalProps {
  onClose: () => void;
}

function EnContent() {
  return (
    <>
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
          A Guide to &quot;The Minor Blend&quot;
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
        If you&apos;re using HARMONY HASH and you notice a chord in a minor progression feels
        &quot;brighter&quot; or has a note that isn&apos;t in your starting scale, don&apos;t worry — it&apos;s not a
        bug. It&apos;s the secret to professional songwriting.
      </p>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        In most modern music (R&amp;B, Jazz, Neo-Soul), we don&apos;t stick to just one &quot;Minor Scale.&quot;
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
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Natural Minor (The Vibe):</strong> This is the &quot;default&quot; minor. It sounds cold, somber, and looped.
          It&apos;s great for the &quot;background&quot; of a song.
        </li>
        <li style={{ marginBottom: "var(--space-3)" }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Harmonic Minor (The Pull):</strong> This version raises the 7th note of the scale. It creates a Major V chord,
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}> which acts like a magnet,</strong> pulling the listener&apos;s ear back to the &quot;Home&quot; chord (i).
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Melodic Minor (The Sophisticate):</strong> This raises even more notes to make the melody sound smoother and &quot;jazzier.&quot;
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
        If we stayed strictly in Natural Minor, <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>your &quot;V&quot; chord would be minor (v).</strong> While that sounds okay, it
        lacks &quot;energy.&quot; It doesn&apos;t tell the listener, &quot;Hey, we&apos;re about to start the loop over!&quot;
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
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>The Result:</strong> The progression feels more &quot;expensive&quot; and professional. It adds a touch of drama
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
        When you stumble across a &quot;Major&quot; chord in a &quot;Minor&quot; progression:
      </p>

      <ol style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
        <li style={{ marginBottom: "var(--space-3)" }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Look for the &quot;leading tone&quot;:</strong> That bright note is usually just a half-step away from your Home
          note. It&apos;s a &quot;guide&quot; for your ear.
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>Feel the Tension:</strong> That chord is there to create a &quot;question.&quot; The next chord (the i minor)
          is the &quot;answer.&quot;
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
        Summary for HARMONY HASH
      </h2>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          marginBottom: "var(--space-4)",
        }}
      >
        We&apos;ve pre-blended these progressions so you don&apos;t have to worry about the math. We use
        Natural Minor <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>for the atmosphere</strong> and Harmonic/Melodic Minor <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>for the &quot;hooks&quot;
        and the &quot;resolutions.&quot;</strong>
      </p>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>It&apos;s the difference between a simple loop and a composition.</strong>
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
        that&apos;s the &quot;Magnetic Pull&quot; in action!
      </blockquote>
    </>
  );
}

function JaContent() {
  return (
    <>
      <header style={{ marginBottom: "var(--space-4)", paddingRight: "var(--space-8)" }}>
        <h1
          style={{
            color: "var(--text-accent)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
            marginBottom: "var(--space-2)",
          }}
        >
          なぜマイナーコードが違うの？
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
          }}
        >
          「マイナーブレンド」ガイド
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
        HARMONY HASHを使っていて、マイナー進行の中のコードが「明るく」感じたり、元のスケールにない音が含まれていても心配しないでください。バグではありません。プロの作曲の秘訣なんです。
      </p>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        現代の音楽（R&amp;B、ジャズ、ネオソウル）では、1つの「マイナースケール」だけに頼ることはしません。最高のサウンドを引き出すために、マイナーを3つのフレーバーの<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>ブレンド</strong>として扱います。
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
        1. マイナーの3つのフレーバー
      </h2>

      <ul style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
        <li style={{ marginBottom: "var(--space-3)" }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>ナチュラルマイナー（雰囲気）：</strong>「デフォルト」のマイナーです。冷たく、もの悲しく、ループ感のあるサウンドです。曲の「バックグラウンド」に最適です。
        </li>
        <li style={{ marginBottom: "var(--space-3)" }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>ハーモニックマイナー（引力）：</strong>スケールの第7音を半音上げたバージョンです。これによりメジャーVコードが生まれ、<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>磁石のように</strong>リスナーの耳を「ホーム」コード（i）へ引き戻します。
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>メロディックマイナー（洗練）：</strong>さらに多くの音を上げることで、メロディをよりスムーズで「ジャジー」に響かせます。
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
        2. なぜブレンドするの？
      </h2>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          marginBottom: "var(--space-4)",
        }}
      >
        ナチュラルマイナーだけを使い続けると、<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>「V」コードはマイナー（v）になります。</strong>悪くはありませんが、「エネルギー」に欠けます。「さあ、ループをもう一度始めるよ！」というメッセージがリスナーに伝わらないのです。
      </p>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          marginBottom: "var(--space-4)",
        }}
      >
        ハーモニックマイナーの音を<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>ブレンド</strong>することで、<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>そのvをV（メジャー）に変える</strong>ことができます。
      </p>

      <ul style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
        <li>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>その結果：</strong>進行がより「高級」でプロフェッショナルに感じられます。ドラマチックな一手が加わり、解決がさらに満足感のあるものになります。
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
        3. 耳に教えてあげること
      </h2>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          marginBottom: "var(--space-4)",
        }}
      >
        「マイナー」進行の中に「メジャー」コードを見つけたら：
      </p>

      <ol style={{ paddingLeft: "var(--space-6)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
        <li style={{ marginBottom: "var(--space-3)" }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>「導音（リーディングトーン）」を探してみましょう：</strong>その明るい音は、通常ホームノートから半音だけ離れています。耳の「ガイド」です。
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>緊張感を感じてみましょう：</strong>そのコードは「質問」を生み出すためにあります。次のコード（iマイナー）が「答え」です。
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
        HARMONY HASHのまとめ
      </h2>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
          marginBottom: "var(--space-4)",
        }}
      >
        これらの進行はあらかじめブレンド済みなので、計算の心配は不要です。<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>雰囲気作り</strong>にはナチュラルマイナーを、<strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>「フック」や「解決」</strong>にはハーモニック/メロディックマイナーを使用しています。
      </p>

      <p
        style={{
          color: "var(--text-primary)",
          fontSize: "var(--text-base)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        <strong style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>シンプルなループと本格的な作品の違いを生み出すのは、まさにこのテクニックです。</strong>
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
        プロのヒント：Am進行で<strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontStyle: "normal" }}>E7</strong>を見かけたら、それが「引力」の正体です！
      </blockquote>
    </>
  );
}

export default function MinorBlendModal({ onClose }: MinorBlendModalProps) {
  const { locale } = useLocale();

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

        {locale === "ja" ? <JaContent /> : <EnContent />}
      </motion.div>
    </div>
  );
}
