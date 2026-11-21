// /calculateur — "Combien coûte vraiment ta douche ?" + collecte de contacts.

import { submitLead } from '../api.js';
import { CONTACT_EMAIL } from '../config.js';
import { estimateShowerCost } from '../stats.js';
import { bindA11yButtons } from '../a11y.js';
import { hydrateIcons } from '../icons.js';
import { $, setText, toast } from '../ui.js';

hydrateIcons();
bindA11yButtons();

const form = $('calc-form');
const eur = (v, digits = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const int = (v) => Math.round(v).toLocaleString('fr-FR');

let last = null; // last inputs + results, sent with the lead

function readInputs() {
  const data = new FormData(form);
  const heater = data.get('heater');
  return {
    minutes: Number(data.get('minutes')),
    showersPerWeek: Number(data.get('perWeek')),
    people: Number(data.get('people')),
    showerhead: data.get('showerhead'),
    heater: heater === 'unknown' ? 'electric' : heater,
    heaterAnswer: heater,
  };
}

function render() {
  const input = readInputs();
  const r = estimateShowerCost(input);
  last = { input, r };

  setText('minutes-out', `${input.minutes} min`);
  setText('perWeek-out', String(input.showersPerWeek));
  setText('people-out', String(input.people));

  setText('year-label', input.people > 1 ? `Les douches de ton foyer coûtent` : 'Tes douches te coûtent');
  setText('year-eur', int(r.yearEur));
  setText('per-shower', `${eur(r.perShowerEur, 2)} €`);
  setText('year-liters', int(r.yearLiters));
  setText('bathtubs', int(r.bathtubs));
  setText('split', `Dont ${int(r.yearEnergyEur)} € de chauffage (${Math.round(r.energyShare * 100)} %) et ${int(r.yearWaterEur)} € d'eau.`);

  setText('saving-text', r.savingMinutes > 0
    ? `En coupant l'eau ${r.savingMinutes} min plus tôt, tu économiserais ${int(r.savingEur)} € et ${int(r.savingLiters)} litres par an.`
    : 'Tes douches sont déjà ultra-courtes. Respect.');

  // Goutti leans with the bill: upright when cheap, tilting as it climbs
  const perPerson = r.yearEur / input.people;
  $('mascot').style.transform = `rotate(${Math.min(18, Math.max(0, (perPerson - 150) / 20))}deg)`;
}

// Fill the slider tracks up to the thumb (WebKit has no ::range-progress)
function paintSliders() {
  form.querySelectorAll('input[type="range"]').forEach((el) => {
    el.style.setProperty('--fill', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
  });
}

form.addEventListener('input', () => {
  paintSliders();
  render();
});
paintSliders();
render();

/* ---------- Share ---------- */

$('share-btn').addEventListener('click', async () => {
  const url = `${location.origin}/calculateur?utm_source=share&utm_medium=referral`;
  const text = `Mes douches me coûtent ${int(last.r.yearEur / last.input.people)} € par an 😱 Et toi ?`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Combien coûte ta douche ?', text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('Lien copié');
    }
  } catch { /* share cancelled */ }
});

/* ---------- Lead capture ---------- */

const privacyMail = $('privacy-mail');
privacyMail.textContent = CONTACT_EMAIL;
privacyMail.href = `mailto:${CONTACT_EMAIL}`;

const params = new URLSearchParams(location.search);
const leadForm = $('lead-form');
const msg = $('lead-msg');

function showMessage(text, type) {
  msg.textContent = text;
  msg.className = `form-msg ${type}`;
}

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(leadForm);
  const email = String(data.get('email') || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showMessage('Vérifie ton adresse e-mail.', 'error');
  if (!data.get('consent')) return showMessage('Coche la case de consentement pour qu’on puisse te recontacter.', 'error');

  const { input, r } = last;
  const button = $('lead-submit');
  button.disabled = true;
  showMessage('Envoi…', '');

  try {
    await submitLead({
      email,
      firstName: data.get('firstName'),
      city: data.get('city'),
      profile: data.get('profile'),
      interests: data.getAll('interests'),
      consent: true,
      website: data.get('website'),
      calc: {
        minutes: input.minutes,
        perWeek: input.showersPerWeek,
        people: input.people,
        showerhead: input.showerhead,
        heater: input.heaterAnswer,
        yearEur: Math.round(r.yearEur),
        yearLiters: Math.round(r.yearLiters),
      },
      source: params.get('utm_source') || params.get('ref'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      referrer: document.referrer,
    });
    leadForm.reset();
    showMessage('C’est noté ! On te recontacte très vite 💧', 'success');
  } catch (err) {
    showMessage(`Oups, l’envoi a échoué (${err.message}). Réessaie dans un instant.`, 'error');
  } finally {
    button.disabled = false;
  }
});
