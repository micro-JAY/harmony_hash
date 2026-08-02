import { useRef, useState } from "react";
import { useLocale } from "../i18n/I18nContext";
import { privacyPolicyContent } from "../privacyPolicyContent";
import AccessibleDialog from "./AccessibleDialog";

export default function PrivacyPolicy() {
  const { locale } = useLocale();
  const copy = privacyPolicyContent[locale];
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <footer className="hh-privacy-footer">
        <span>HARMONY HASH — TONARI LABS</span>
        <button
          ref={buttonRef}
          type="button"
          className="hh-privacy-button"
          onClick={() => setOpen(true)}
        >
          {copy.button}
        </button>
      </footer>
      {open ? (
        <AccessibleDialog
          title={copy.title}
          closeLabel={copy.close}
          onRequestClose={() => setOpen(false)}
          returnFocusRef={buttonRef}
          maxWidth="54rem"
          contentClassName="hh-privacy-content"
          description={copy.intro}
        >
          <p className="hh-privacy-effective">{copy.effective}</p>
          <div className="hh-privacy-sections">
            {copy.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
          <p className="hh-privacy-contact">
            <a href="mailto:privacy@tonari.ai">{copy.contact}</a>
          </p>
        </AccessibleDialog>
      ) : null}
    </>
  );
}
