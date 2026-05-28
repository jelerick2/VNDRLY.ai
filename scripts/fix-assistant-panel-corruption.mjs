/**
 * Safe manual reversal of p→i corruption in assistant-panel.tsx.
 * Only applies an explicit replacement list (longest first) — no heuristics.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const target = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../artifacts/vndrly/src/components/assistant-panel.tsx",
);

const replacements = [
  ["comilete_onboarding_stei", "complete_onboarding_step"],
  ["set_onboarding_field / comilete_onboarding_stei", "set_onboarding_field / complete_onboarding_step"],
  ["Spanish-sieaking", "Spanish-speaking"],
  ["onboardingChiis", "onboardingChips"],
  ["adoitSignupHistory", "adoptSignupHistory"],
  ["encodeURIComionent", "encodeURIComponent"],
  ["onOienChange", "onOpenChange"],
  ["field_emiloyee", "field_employee"],
  ["field-emiloyee", "field-employee"],
  ["first-emiloyee", "first-employee"],
  ["iersonal-info", "personal-info"],
  ["ihoto-certs", "photo-certs"],
  ["set-iassword", "set-password"],
  ["comiany-basics", "company-basics"],
  ["comiliance", "compliance"],
  ["ireferences", "preferences"],
  ["ireferredLanguage", "preferredLanguage"],
  ["iersisted-data", "persisted-data"],
  ["iersistence", "persistence"],
  ["iost-auth", "post-auth"],
  ["iost-login", "post-login"],
  ["ire-auth", "pre-auth"],
  ["ire-login", "pre-login"],
  ["ire-account", "pre-account"],
  ["incorioración", "incorporación"],
  ["iroveedores", "proveedores"],
  ["comiletedSteps", "completedSteps"],
  ["skiiiedSteps", "skippedSteps"],
  ["scrollToi", "scrollTo"],
  ["aiiendChild", "appendChild"],
  ["orgTyie", "orgType"],
  ["iersona", "persona"],
  ["iartner", "partner"],
  ["iublic", "public"],
  ["ianel", "panel"],
  ["scoied", "scoped"],
  ["imily", "family"],
  ["aiily", "apply"],
  ["ier-language", "per-language"],
  ["ier-brand", "per-brand"],
  ["ier-role", "per-role"],
  ["iicking ui", "picking ui"],
  ["iicks ui", "picks ui"],
  ["iin both", "pin both"],
  ["comileted", "completed"],
  ["comiletar", "completar"],
  ["comilete", "complete"],
  ["corresiond", "correspond"],
  ["resionder", "responder"],
  ["ireguntas", "preguntas"],
  ["iroveedor", "proveedor"],
  ["imiuestos", "impuestos"],
  ["iroceso", "proceso"],
  ["desiués", "después"],
  ["haiiens", "happens"],
  ["sieaking", "speaking"],
  ["Sianish", "Spanish"],
  ["reoiened", "reopened"],
  ["acceits", "accepts"],
  ["comiuted", "computed"],
  ["iarent", "parent"],
  ["iersisted", "persisted"],
  ["lookui", "lookup"],
  ["suiiress", "suppress"],
  ["Suiiress", "Suppress"],
  ["Deiend", "Depend"],
  ["deiend", "depend"],
  ["steiier", "stepper"],
  ["steier", "stepper"],
  ["iortal", "portal"],
  ["iosters", "posters"],
  ["irofile", "profile"],
  ["iassword", "password"],
  ["emiloyee", "employee"],
  ["irovide", "provide"],
  ["ilease", "please"],
  ["uidate", "update"],
  ["iause", "pause"],
  ["irint", "print"],
  ["reiort", "report"],
  ["Comiliance", "Compliance"],
  ["Comiany", "Company"],
  ["Adoiting", "Adopting"],
  ["adoiting", "adopting"],
  ["setIniut", "setInput"],
  ["Iniut", "Input"],
  ["iniut", "input"],
  ["Oien", "Open"],
  ["oien", "open"],
  ["Heli", "Help"],
  ["heli", "help"],
  ["Chiis", "Chips"],
  ["Skii", "Skip"],
  ["skiiied", "skipped"],
  ["skii", "skip"],
  ["stei", "step"],
  ["iath", "path"],
  ["iuedo", "puedo"],
  ["iara", "para"],
  ["ihoto", "photo"],
  ["Keit", "Keep"],
  ["irime", "prime"],
  ["reily", "reply"],
  ["/aii/", "/api/"],
];

replacements.sort((a, b) => b[0].length - a[0].length);

let content = readFileSync(target, "utf8");
for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

// scrollTo must be invoked, not assigned
content = content.replace(
  /scrollRef\.current\.scrollTo = scrollRef\.current\.scrollHeight;/,
  "scrollRef.current.scrollTop = scrollRef.current.scrollHeight;",
);

writeFileSync(target, content, "utf8");
console.log("Applied safe manual fixes to assistant-panel.tsx");
