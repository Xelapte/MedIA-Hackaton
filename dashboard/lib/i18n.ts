export type Lang = "en" | "fr";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "nav.liveRadio": "Live Radio",
    "nav.factCheck": "Fact-Check",
    "nav.interview": "Interview",
    "nav.searchPlaceholder": "Search articles",
    "nav.searchLabel": "Search articles",

    "factCheck.eyebrow": "Submit a Claim",
    "factCheck.heading": "Fact-check anything",
    "factCheck.description":
      "Paste a claim, record yourself saying it, or upload an audio clip — it goes through the same verification pipeline as our live radio feeds.",
    "factCheck.modeText": "Text",
    "factCheck.modeAudio": "Audio",
    "factCheck.startRecording": "Start recording",
    "factCheck.stopRecording": "Stop recording",
    "factCheck.or": "or",
    "factCheck.uploadFile": "Upload a file",
    "factCheck.transcribing": "Transcribing…",
    "factCheck.transcribeError": "Couldn't transcribe that audio.",
    "factCheck.micError": "Couldn't access your microphone — check your browser permissions.",
    "factCheck.reviewLabel": "Review the transcript before submitting",
    "factCheck.textLabel": "Enter a claim or paste some text",
    "factCheck.placeholder": "e.g. \"The country's unemployment rate hit a record low last month.\"",
    "factCheck.submit": "Fact-Check This",
    "factCheck.submitError": "Submission failed — try again.",
    "factCheck.submitAnother": "Submit another",
    "factCheck.analyzing": "Analyzing your claim…",
    "factCheck.analyzingNote": "This searches the web and cross-checks sources, so it typically takes 20-60 seconds.",
    "factCheck.ready": "Fact-check ready",
    "factCheck.viewFull": "View full analysis",

    "home.heroEyebrow": "About Verity",
    "home.heroHeading": "Real-time fact-checking for live radio",
    "home.heroDescription":
      "Verity listens to live news radio, transcribes every broadcast, and fact-checks each claim as it airs — cross-referencing sources and scoring each station's track record. Browse verified stories below, or head to Live Radio to watch it happen station by station.",

    "home.loading": "Loading verified stories…",
    "home.eyebrowTop": "Top Stories",
    "home.eyebrowSearch": 'Results for "{q}"',
    "home.headingDefault": "Verified, in real time",
    "home.headingSearch": "Search Results",
    "home.headingCategory": "{category} News",
    "home.emptyFiltered": "No stories match your filters.",
    "home.emptyDefault": "Listening for incoming stories… send a POST request to /api/webhook.",

    "article.loading": "Loading…",
    "article.notFound": "This story isn't available anymore.",
    "article.backToTop": "Back to top stories",
    "article.home": "Home",
    "article.filed": "Filed",
    "article.trust": "Trust",
    "article.confidence": "Confidence",
    "article.evidenceLog": "Evidence Log",
    "article.why": "Why",
    "article.view": "View",
    "article.fullAnalysis": "Full Analysis",
    "article.methodology": "Methodology",
    "article.methodologyBody":
      "Each claim above is traced back to the primary source it came from and cross-referenced against independent outlets. The badge shown is the least favorable verdict among all sources checked — so a single misleading or false source can't be hidden behind stronger ones. Trust Level and Confidence reflect the overall reliability and agreement of the sources checked, not the claim's popularity or recency.",

    "audio.label": "Original broadcast",
    "audio.jumpToMoment": "Jump to moment",
    "audio.notAvailable": "Audio clip is still processing or unavailable.",

    "verdict.true": "Verified",
    "verdict.false": "False",
    "verdict.misleading": "Misleading",
    "verdict.unverifiable": "Unverified",

    "trust.high": "High",
    "trust.medium": "Medium",
    "trust.low": "Low",
    "trust.unverifiable": "Unverifiable",

    "gravity.label": "Gravity",
    "gravity.1": "Trivial / hyperlocal",
    "gravity.2": "Local interest",
    "gravity.3": "Minor national",
    "gravity.4": "Notable national",
    "gravity.5": "Significant national",
    "gravity.6": "Major national",
    "gravity.7": "Major international",
    "gravity.8": "Severe international",
    "gravity.9": "World-altering",
    "gravity.10": "Historic / civilization-scale",

    "bs.label": "Bullshit Score",
    "bs.notEnoughData": "Not enough data yet",
    "bs.basedOn": "Based on {count} fact-checked stories",
    "bs.rating.trustworthy": "Trustworthy",
    "bs.rating.mostlyReliable": "Mostly reliable",
    "bs.rating.mixed": "Mixed record",
    "bs.rating.questionable": "Questionable",
    "bs.rating.unreliable": "Unreliable",
    "bs.overall": "Overall",
    "bs.byTopic": "By topic",

    "card.sourcesChecked": "{count} source checked",
    "card.sourcesCheckedPlural": "{count} sources checked",

    "radio.eyebrow": "Live Radio",
    "radio.heading": "News radio, straight from the source",
    "radio.description":
      "Listen live to news and talk radio from {count} countries. Stations marked Monitored are being transcribed and fact-checked in real time — visit a station's page to see verified claims as they air.",
    "radio.monitored": "Monitored",
    "radio.listenOnly": "Listen only",
    "radio.details": "Details",
    "radio.notFound": "This station isn't in our lineup.",
    "radio.backToRadio": "Back to Live Radio",
    "radio.monitoredNote": "Monitored — claims are transcribed and fact-checked live",
    "radio.listenOnlyNote": "Listen only — not currently monitored for fact-checking",
    "radio.listenLive": "Listen Live",
    "radio.pause": "Pause",
    "radio.factCheckedHeading": "Fact-checked from this station",
    "radio.emptyMonitored": "Listening for claims… nothing verified yet.",
    "radio.emptyUnmonitored":
      "No fact-checked stories yet. This station isn't being monitored — toggle it on from the Live Radio page once a transcription pipeline is running for it.",
    "radio.allStations": "All stations",
    "radio.close": "Close",
    "radio.mapLegendMonitored": "Monitored",
    "radio.mapLegendListenOnly": "Listen only",
    "radio.viewByCountry": "By country",
    "radio.viewMap": "Map view",
    "radio.byCountry": "By Country",
    "radio.byCountryHeading": "Stations by country",
    "radio.byCountryDescription":
      "Every station grouped by country, with its Bullshit Score and monitoring status at a glance.",
    "radio.stationsCount": "{count} stations",
    "radio.history": "History",
    "radio.claimAnalysis": "Claim Analysis",
    "radio.statistics": "Statistics",

    "interview.eyebrow": "Live Interview",
    "interview.heading": "Fact-check an interview as it happens",
    "interview.description":
      "Start recording and Verity transcribes what's said in near real time, automatically fact-checking every substantial claim as it comes in — the same pipeline as our live radio feeds.",
    "interview.start": "Start Interview",
    "interview.stop": "Stop Interview",
    "interview.startNew": "Start New Interview",
    "interview.live": "Live",
    "interview.ended": "Session ended",
    "interview.sessionTime": "Session time",
    "interview.emptyIdle": "Start an interview session to see live fact-checks appear here.",

    "player.liveNow": "Live now",
    "player.paused": "Paused",
  },
  fr: {
    "nav.liveRadio": "Radio en direct",
    "nav.searchPlaceholder": "Rechercher des articles",
    "nav.searchLabel": "Rechercher des articles",
    "nav.factCheck": "Vérifier",
    "nav.interview": "Interview",

    "factCheck.eyebrow": "Soumettre une affirmation",
    "factCheck.heading": "Vérifiez n'importe quelle affirmation",
    "factCheck.description":
      "Collez une affirmation, enregistrez-vous en train de la dire, ou importez un extrait audio — elle passe par le même pipeline de vérification que nos radios en direct.",
    "factCheck.modeText": "Texte",
    "factCheck.modeAudio": "Audio",
    "factCheck.startRecording": "Démarrer l'enregistrement",
    "factCheck.stopRecording": "Arrêter l'enregistrement",
    "factCheck.or": "ou",
    "factCheck.uploadFile": "Importer un fichier",
    "factCheck.transcribing": "Transcription en cours…",
    "factCheck.transcribeError": "Impossible de transcrire cet audio.",
    "factCheck.micError": "Impossible d'accéder à votre microphone — vérifiez les permissions de votre navigateur.",
    "factCheck.reviewLabel": "Relisez la transcription avant de soumettre",
    "factCheck.textLabel": "Entrez une affirmation ou collez du texte",
    "factCheck.placeholder": "ex. « Le taux de chômage du pays a atteint un niveau record le mois dernier. »",
    "factCheck.submit": "Vérifier ceci",
    "factCheck.submitError": "Échec de la soumission — réessayez.",
    "factCheck.submitAnother": "Soumettre une autre affirmation",
    "factCheck.analyzing": "Analyse de votre affirmation…",
    "factCheck.analyzingNote": "Cela recherche sur le web et recoupe les sources, ce qui prend généralement 20 à 60 secondes.",
    "factCheck.ready": "Vérification terminée",
    "factCheck.viewFull": "Voir l'analyse complète",

    "home.heroEyebrow": "À propos de Verity",
    "home.heroHeading": "Le fact-checking en temps réel de la radio en direct",
    "home.heroDescription":
      "Verity écoute les radios d'information en direct, transcrit chaque diffusion et vérifie chaque affirmation au moment où elle est prononcée — en recoupant les sources et en notant la fiabilité de chaque station. Parcourez les actualités vérifiées ci-dessous, ou rendez-vous sur Radio en direct pour le voir se faire station par station.",

    "home.loading": "Chargement des actualités vérifiées…",
    "home.eyebrowTop": "À la une",
    "home.eyebrowSearch": 'Résultats pour "{q}"',
    "home.headingDefault": "Vérifié, en temps réel",
    "home.headingSearch": "Résultats de recherche",
    "home.headingCategory": "Actualités {category}",
    "home.emptyFiltered": "Aucun article ne correspond à vos filtres.",
    "home.emptyDefault": "En attente de nouvelles histoires… envoyez une requête POST à /api/webhook.",

    "article.loading": "Chargement…",
    "article.notFound": "Cet article n'est plus disponible.",
    "article.backToTop": "Retour à la une",
    "article.home": "Accueil",
    "article.filed": "Publié",
    "article.trust": "Confiance",
    "article.confidence": "Indice de confiance",
    "article.evidenceLog": "Journal des preuves",
    "article.why": "Pourquoi",
    "article.view": "Voir",
    "article.fullAnalysis": "Analyse complète",
    "article.methodology": "Méthodologie",
    "article.methodologyBody":
      "Chaque affirmation ci-dessus est retracée jusqu'à sa source principale et recoupée avec des médias indépendants. Le badge affiché correspond au verdict le moins favorable parmi toutes les sources vérifiées — une seule source trompeuse ou fausse ne peut donc pas se cacher derrière des sources plus fiables. Le niveau de confiance et l'indice de confiance reflètent la fiabilité globale et l'accord des sources vérifiées, pas la popularité ou la récence de l'affirmation.",

    "audio.label": "Diffusion originale",
    "audio.jumpToMoment": "Aller au moment",
    "audio.notAvailable": "L'extrait audio est encore en cours de traitement ou indisponible.",

    "verdict.true": "Vérifié",
    "verdict.false": "Faux",
    "verdict.misleading": "Trompeur",
    "verdict.unverifiable": "Non vérifié",

    "trust.high": "Élevée",
    "trust.medium": "Moyenne",
    "trust.low": "Faible",
    "trust.unverifiable": "Non vérifiable",

    "gravity.label": "Portée",
    "gravity.1": "Anecdotique / local",
    "gravity.2": "Intérêt local",
    "gravity.3": "Mineur national",
    "gravity.4": "National notable",
    "gravity.5": "National significatif",
    "gravity.6": "Majeur national",
    "gravity.7": "Majeur international",
    "gravity.8": "International sévère",
    "gravity.9": "Bouleversant",
    "gravity.10": "Historique / mondial",

    "bs.label": "Indice Baratin",
    "bs.notEnoughData": "Pas encore assez de données",
    "bs.basedOn": "Basé sur {count} articles vérifiés",
    "bs.rating.trustworthy": "Fiable",
    "bs.rating.mostlyReliable": "Plutôt fiable",
    "bs.rating.mixed": "Bilan mitigé",
    "bs.rating.questionable": "Douteux",
    "bs.rating.unreliable": "Peu fiable",
    "bs.overall": "Global",
    "bs.byTopic": "Par thème",

    "card.sourcesChecked": "{count} source vérifiée",
    "card.sourcesCheckedPlural": "{count} sources vérifiées",

    "radio.eyebrow": "Radio en direct",
    "radio.heading": "L'actualité radio, à la source",
    "radio.description":
      "Écoutez en direct des radios d'actualité et de débat de {count} pays. Les stations marquées Surveillée sont transcrites et vérifiées en temps réel — consultez la page d'une station pour voir les affirmations vérifiées au fil de l'antenne.",
    "radio.monitored": "Surveillée",
    "radio.listenOnly": "Écoute seule",
    "radio.details": "Détails",
    "radio.notFound": "Cette station ne fait pas partie de notre sélection.",
    "radio.backToRadio": "Retour à Radio en direct",
    "radio.monitoredNote": "Surveillée — les affirmations sont transcrites et vérifiées en direct",
    "radio.listenOnlyNote": "Écoute seule — cette station n'est pas surveillée pour le fact-checking",
    "radio.listenLive": "Écouter en direct",
    "radio.pause": "Pause",
    "radio.factCheckedHeading": "Vérifié depuis cette station",
    "radio.emptyMonitored": "En écoute… rien de vérifié pour l'instant.",
    "radio.emptyUnmonitored":
      "Aucun article vérifié pour l'instant. Cette station n'est pas surveillée — activez-la depuis la page Radio en direct une fois un pipeline de transcription lancé.",
    "radio.allStations": "Toutes les stations",
    "radio.close": "Fermer",
    "radio.mapLegendMonitored": "Surveillée",
    "radio.mapLegendListenOnly": "Écoute seule",
    "radio.viewByCountry": "Par pays",
    "radio.viewMap": "Vue carte",
    "radio.byCountry": "Par pays",
    "radio.byCountryHeading": "Stations par pays",
    "radio.byCountryDescription":
      "Toutes les stations regroupées par pays, avec leur Bullshit Score et leur statut de surveillance en un coup d'œil.",
    "radio.stationsCount": "{count} stations",
    "radio.history": "Historique",
    "radio.claimAnalysis": "Analyse du claim",
    "radio.statistics": "Statistiques",

    "interview.eyebrow": "Interview en direct",
    "interview.heading": "Vérifiez une interview en temps réel",
    "interview.description":
      "Lancez l'enregistrement et Verity transcrit ce qui est dit en quasi temps réel, en vérifiant automatiquement chaque affirmation substantielle au fil de l'eau — le même pipeline que nos flux radio en direct.",
    "interview.start": "Démarrer l'interview",
    "interview.stop": "Arrêter l'interview",
    "interview.startNew": "Nouvelle interview",
    "interview.live": "En direct",
    "interview.ended": "Session terminée",
    "interview.sessionTime": "Durée de la session",
    "interview.emptyIdle": "Démarrez une session d'interview pour voir les vérifications apparaître ici.",

    "player.liveNow": "En direct",
    "player.paused": "En pause",
  },
};

// Categories are a small, bounded vocabulary (unlike article body text), so a
// static lookup is more reliable and instant than an LLM call. Falls back to
// the original string for anything not in the table (AI-generated categories
// are freeform, not a strict enum).
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  politics: "Politique",
  health: "Santé",
  technology: "Technologie",
  global: "Mondial",
  world: "Monde",
  finance: "Finance",
  economy: "Économie",
  business: "Affaires",
  culture: "Culture",
  sports: "Sport",
  local: "Local",
  science: "Science",
  environment: "Environnement",
  security: "Sécurité",
  justice: "Justice",
  education: "Éducation",
  immigration: "Immigration",
};

export function translateCategory(lang: Lang, category: string): string {
  if (lang === "en") return category;
  return CATEGORY_TRANSLATIONS[category.toLowerCase().trim()] ?? category;
}

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const template = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template
  );
}
