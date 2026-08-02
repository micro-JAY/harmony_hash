import type { Locale } from "./i18n/translations";

export interface PrivacySection {
  title: string;
  body: string;
}

export interface PrivacyPolicyCopy {
  button: string;
  title: string;
  close: string;
  effective: string;
  intro: string;
  contact: string;
  sections: readonly PrivacySection[];
}

export const privacyPolicyContent: Record<Locale, PrivacyPolicyCopy> = {
  en: {
    button: "Privacy Policy",
    title: "Privacy Policy",
    close: "Close privacy policy",
    effective: "Effective December 13, 2025 · Last updated August 1, 2026",
    intro: "This notice explains how Harmony Hash processes musical, technical, prompt, and live voice information, including the choices and rights available in the EEA, United Kingdom, United States, Japan, and other regions.",
    contact: "Questions and rights requests: privacy@tonari.ai",
    sections: [
      {
        title: "1. Scope and operator",
        body: "This notice applies to Harmony Hash. Tonari Labs is the trade name used by Jana Jennings (ジェニングス ジャナ), an individual operator in Japan who determines the purposes described below and is responsible for the personal information processing described in this notice. Contact: privacy@tonari.ai. The operator's private residential address is not published for personal safety; where applicable law requires it, the address will be provided without delay upon request at privacy@tonari.ai. Linked sites publish their own notices.",
      },
      {
        title: "2. Information and sources",
        body: "We process musical choices such as chords, keys, modes, instruments, voicings, and progression state; text you enter into the progression builder; live microphone audio and conversation text when you start Hanz; device language and onboarding state; and technical data such as IP address, browser, requested URL, timestamp, approximate region, security events, and service diagnostics.",
      },
      {
        title: "3. Local musical state",
        body: "Chord selections, playback state, and most workspace activity remain in browser memory. Share links encode a progression in the URL you choose to copy. Onboarding preferences may be stored in localStorage or sessionStorage. Tonari does not maintain an account database of your Harmony Hash progressions.",
      },
      {
        title: "4. AI progression builder",
        body: "When you submit a description, the prompt and relevant musical context pass through a Cloudflare Worker to the OpenAI Responses API. Requests set store:false, so no OpenAI application state is requested; standard abuse-monitoring logs may nevertheless retain content for up to the provider's stated period unless an approved data-control setting applies. Tonari does not use prompts to train its own model.",
      },
      {
        title: "5. Hanz voice companion",
        body: "Hanz starts only when you choose the voice feature and grant microphone access. Audio is streamed to ElevenLabs for real-time speech recognition and response generation, and musical client tools exchange chord and progression state. To display the conversation, this browser tab keeps up to 20 recent user and Hanz messages in React memory; they are cleared when a conversation starts or disconnects, and Tonari does not persist them in browser storage or an application database. Tonari does not create or keep an audio recording. For new conversations, the source-controlled agent disables voice recording and requests zero-day retention plus deletion of audio, transcript, and detected PII. Short-lived processing, security logs, and legal exceptions may still apply at the provider.",
      },
      {
        title: "6. Purposes and legal bases",
        body: "We process information to provide requested music tools, generate progressions, operate Hanz, remember settings, secure and diagnose the service, prevent abuse, understand aggregate reliability, comply with law, and resolve claims. Where GDPR or UK GDPR applies, requested features rely on performance of your request or pre-contractual steps; necessary security, diagnostics, and improvement rely on legitimate interests; legal compliance relies on legal obligation; and non-essential storage or analytics relies on consent where required.",
      },
      {
        title: "7. Providers and disclosures",
        body: "Cloudflare hosts, secures, rate-limits, and may provide privacy-focused web analytics; OpenAI processes progression prompts; ElevenLabs processes Hanz conversations; and email providers handle privacy correspondence. We may disclose information to advisers, authorities, or a successor when reasonably necessary and lawful. We do not sell personal information or use it for cross-context behavioral advertising.",
      },
      {
        title: "8. Retention",
        body: "Browser-memory musical state ends when the page is closed or refreshed; device preferences remain until changed or cleared. Tonari's progression endpoint does not create a prompt database. Future Hanz conversations are configured for voice recording off and zero-day conversation retention, without retroactively deleting historical provider records. Infrastructure, security, email, and legally required records follow their configured or necessary periods.",
      },
      {
        title: "9. Cookies, device controls, and privacy signals",
        body: "Harmony Hash uses browser storage for necessary preferences and may receive Cloudflare security technology. You can revoke microphone access and clear site data in browser settings. Where applicable, a valid Global Privacy Control signal is treated as a request to opt out of sale or sharing; no such sale or advertising sharing is used. Do Not Track has no uniform standard and receives no separate response.",
      },
      {
        title: "10. International transfers",
        body: "Tonari Labs operates from Japan and providers may process data in Japan, the United States, the EEA, or other countries. Where required, transfers use adequacy decisions, Standard Contractual Clauses, or another lawful safeguard. You may request information about the safeguards that apply.",
      },
      {
        title: "11. EEA, UK, and Swiss rights",
        body: "Where applicable, you may request access, correction, deletion, restriction, portability, or a copy; object to processing; withdraw consent; and complain to a supervisory authority. Rights can be limited by law. We may verify identity and respond within the legally required period.",
      },
      {
        title: "12. California and other U.S. state rights",
        body: "Where applicable, you may request categories, sources, purposes, recipients, and specific pieces of personal information; correction, deletion, or portability; opt out of sale, sharing, or targeted advertising; limit certain sensitive-information uses; appeal a denial; and receive equal service. We offer no financial incentive for personal information. A verified authorized agent may submit a request.",
      },
      {
        title: "13. Japan APPI and other regional rights",
        body: "The utilization purposes are listed in section 6, entrusted processors in section 7, and foreign processing in section 10. Where APPI applies, you may request purpose notification, disclosure of retained data or transfer records, correction, deletion, suspension of use, erasure, or suspension of third-party provision, and may consult Japan's Personal Information Protection Commission. Other regions may provide comparable rights that we honor where applicable.",
      },
      {
        title: "14. Automated processing",
        body: "AI suggestions and Hanz responses support music learning and may be inaccurate. They do not make decisions producing legal or similarly significant effects and are not used for employment, credit, insurance, housing, or access to essential services.",
      },
      {
        title: "15. Security and incidents",
        body: "We use HTTPS, signed voice-session URLs, server-side provider keys, rate limiting, access controls, data minimization, and provider security services. No system is completely secure. We investigate and mitigate qualifying incidents and notify people and authorities where law requires.",
      },
      {
        title: "16. Children",
        body: "Harmony Hash is a general-audience music tool and is not directed to children under 13 in the United States or the equivalent minimum age elsewhere. We do not knowingly collect their personal information. Contact us if you believe a child provided information.",
      },
      {
        title: "17. Changes and contact",
        body: "We may update this notice when features, providers, settings, or laws change. The effective and last-updated dates identify the current version and material changes will receive proportionate notice. Send requests to privacy@tonari.ai and identify Harmony Hash and the right you want to exercise.",
      },
    ],
  },
  ja: {
    button: "プライバシーポリシー",
    title: "プライバシーポリシー",
    close: "プライバシーポリシーを閉じる",
    effective: "施行日：2025年12月13日・最終更新日：2026年8月1日",
    intro: "本通知では、Harmony Hashが取り扱う音楽情報、技術情報、プロンプト、ライブ音声と、EEA、英国、米国、日本その他の地域で利用できる選択肢および権利を説明します。",
    contact: "ご質問・権利請求：privacy@tonari.ai",
    sections: [
      { title: "1. 適用範囲と運営者", body: "本通知はHarmony Hashに適用されます。Tonari Labsは、日本在住の個人運営者ジェニングス ジャナ（Jana Jennings）が使用する屋号です。下記の利用目的を定め、本通知に記載する個人情報の取扱いに責任を負う者はジェニングス ジャナです。連絡先：privacy@tonari.ai。個人の安全確保のため私的な居住住所はウェブ上に掲載しませんが、適用法令上必要な場合、privacy@tonari.aiへの請求に対し遅滞なく回答します。リンク先には各運営者の通知が適用されます。" },
      { title: "2. 取り扱う情報と取得元", body: "コード、キー、モード、楽器、ボイシング、進行状態等の音楽上の選択、進行ビルダーへ入力した文章、Hanzを開始した場合のライブマイク音声と会話テキスト、端末言語とオンボーディング状態、IPアドレス、ブラウザ、URL、時刻、おおよその地域、セキュリティイベント、診断情報等を処理します。" },
      { title: "3. 端末内の音楽データ", body: "コード選択、再生状態、ワークスペース操作の大部分はブラウザメモリ内に留まります。共有リンクにはコピーを選択した進行がURLとして含まれます。オンボーディング設定はlocalStorageまたはsessionStorageへ保存する場合があります。Tonariは進行を保存するアカウントデータベースを運営しません。" },
      { title: "4. AI進行ビルダー", body: "説明を送信すると、プロンプトと関連する音楽情報がCloudflare Workerを経由してOpenAI Responses APIへ送られます。リクエストはstore:falseでアプリケーション状態の保存を要求しませんが、承認済みデータ管理設定がない場合、標準の不正利用監視ログに事業者所定の期間保存される可能性があります。Tonari独自モデルの学習には利用しません。" },
      { title: "5. Hanz音声コンパニオン", body: "Hanzは音声機能を選択しマイクを許可した場合のみ開始します。音声はリアルタイム認識と応答生成のためElevenLabsへ送信され、音楽クライアントツールはコード・進行状態を交換します。会話表示のため、このブラウザタブは利用者とHanzの直近20件までのメッセージをReactのメモリ内に一時保持しますが、会話の開始時または切断時に消去し、ブラウザストレージやTonariのアプリケーションデータベースには保存しません。Tonariは音声録音を作成・保存しません。新規会話について、ソース管理された設定で録音を無効化し、保存0日ならびに音声・文字起こし・検出PIIの削除を要求します。事業者の短時間処理、セキュリティログ、法的例外は残る場合があります。" },
      { title: "6. 利用目的と法的根拠", body: "要求された音楽機能、進行生成、Hanz、設定保存、セキュリティ、診断、不正防止、集計された信頼性把握、法令遵守、紛争対応に利用します。GDPR等が適用される場合、要求機能は依頼の履行または契約前手続、必要な安全管理・診断・改善は正当な利益、法令対応は法的義務、法令上必要な非必須保存・分析は同意に基づきます。" },
      { title: "7. 委託先と開示", body: "Cloudflareはホスティング、保護、レート制限、プライバシー重視の分析、OpenAIは進行プロンプト、ElevenLabsはHanz会話、メール事業者はお問い合わせを処理します。適法かつ合理的に必要な場合、専門家、当局、事業承継先へ開示することがあります。個人情報を販売せず、クロスコンテキスト行動広告に利用しません。" },
      { title: "8. 保存期間", body: "ブラウザメモリ内の音楽状態はページを閉じるか更新すると終了し、端末設定は変更または削除まで残ります。Tonariの進行エンドポイントはプロンプトDBを作成しません。将来のHanz会話は録音無効・保存0日に設定し、過去の事業者記録を遡って削除しません。基盤、セキュリティ、メール、法令上必要な記録には各設定または必要期間が適用されます。" },
      { title: "9. Cookie、端末設定、プライバシー信号", body: "必要な設定にブラウザストレージを利用し、Cloudflareのセキュリティ技術が動作する場合があります。ブラウザからマイク許可を取り消し、サイトデータを削除できます。適用される有効なGlobal Privacy Control信号は販売・共有からのオプトアウトとして扱いますが、本サービスに当該販売・広告共有はありません。Do Not Trackには統一基準がないため個別に応答しません。" },
      { title: "10. 国外移転", body: "Tonari Labsは日本から運営し、委託先は日本、米国、EEAその他の国で処理する場合があります。必要に応じ、十分性認定、標準契約条項その他の適法な保護措置を利用します。適用される保護措置の情報を請求できます。" },
      { title: "11. EEA・英国・スイスでの権利", body: "適用される場合、アクセス、訂正、削除、処理制限、移転または写しの取得、異議、同意撤回、監督機関への苦情を請求できます。法令上の制限があり、本人確認を行う場合があります。法定期間内に回答します。" },
      { title: "12. カリフォルニア州その他米国州法上の権利", body: "適用される場合、種類、取得元、目的、提供先、具体的情報の開示、訂正、削除、ポータビリティ、販売・共有・ターゲティング広告からのオプトアウト、特定の機微情報利用の制限、拒否への不服申立て、不利益取扱いの禁止を求められます。個人情報の対価となるインセンティブはありません。認定代理人による本人確認済み請求も可能です。" },
      { title: "13. 日本の個人情報保護法その他地域の権利", body: "利用目的は第6項、委託先は第7項、国外処理は第10項のとおりです。適用される場合、利用目的の通知、保有個人データまたは提供記録の開示、訂正、削除、利用停止、消去、第三者提供停止を請求でき、個人情報保護委員会へ相談できます。その他の地域でも適用される同等の権利に対応します。" },
      { title: "14. 自動処理", body: "AI提案とHanzの応答は音楽学習を支援するもので、誤る場合があります。法的効果または同様の重大な影響を生じる決定を行わず、雇用、信用、保険、住宅、重要サービスへのアクセス判断には利用しません。" },
      { title: "15. 安全管理とインシデント", body: "HTTPS、署名付き音声セッションURL、サーバー側事業者キー、レート制限、アクセス制御、データ最小化、委託先のセキュリティ機能を利用します。完全な安全性は保証できません。通知対象の事案を調査・軽減し、法令に従って本人と当局へ通知します。" },
      { title: "16. 子ども", body: "Harmony Hashは一般向け音楽ツールで、米国の13歳未満または各地域の同等の最低年齢未満を対象とせず、その個人情報を故意に収集しません。子どもが情報を提供したと思われる場合はご連絡ください。" },
      { title: "17. 変更と連絡先", body: "機能、委託先、設定、法令の変更に応じて更新します。施行日と最終更新日が現行版を示し、重要な変更には相応の通知を行います。Harmony Hashと行使したい権利を明記してprivacy@tonari.aiへお送りください。" },
    ],
  },
};
