import './TonariHomeLink.css';

export default function TonariHomeLink() {
  return (
    <a
      href="https://tonari.ai"
      className="tonari-home-link"
      aria-label="Back to Tonari Labs"
    >
      <span className="tonari-home-link__arrow">←</span>
      <span className="tonari-home-link__text">TONARI LABS</span>
    </a>
  );
}
