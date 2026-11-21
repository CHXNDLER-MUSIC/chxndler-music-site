"use client";

import { useMemo, useState } from "react";

type Template = { id: string; name: string; channel: string; subject?: string; body: string };

const templates: Template[] = [
  {
    id: "card-giveaway-personal",
    name: "Golden Card · Personal",
    channel: "DM / email",
    body: "Thought y’all might appreciate this! 👽\n\nEveryone can claim a free CHXNDLER card, and one random person is going to get the Golden Card, which wins a free custom song. I’ll write and produce it completely free.\nHope you enjoy it, and if someone comes to mind who’d love this too, I’d really appreciate you passing it along. Good luck! 💛\n\n— {{sender_name}}",
  },
  {
    id: "card-giveaway-share",
    name: "Golden Card · Share",
    channel: "DM / email",
    body: "Thought you might appreciate this! 👽\n\nThe Golden Card giveaway is officially live! Just head to {{website}} and click “Claim Your CHXNDLER Card.” One random person will pull the Golden Card and win a song that I’ll write and produce for them for free.\n\nIf you know someone who’d be into this, would really appreciate you sending it their way. Good luck! 🤘🏼\n\n— {{sender_name}}",
  },
  {
    id: "booking-intro",
    name: "Booking · Warm introduction",
    channel: "DM / email",
    body: "Hey {{contact_first_name}}! My name's {{sender_name}}, and I'm a good friend of {{mutual_contact}}. I came to see {{band_name}} at {{venue}} a couple of weeks ago, and you guys absolutely killed it.\nI'm an alt-electro pop artist based in {{city}}, and I go by CHXNDLER. I'm looking to book more shows around {{city}}, and {{mutual_contact}} mentioned that you handle bookings for {{band_name}}, so they suggested I reach out to you directly.\nI'd love to chat and hear any advice you have on getting booked at venues like {{venue}} or elsewhere in the city.\nHere's my music: {{music_link}}\nThanks! Hope to meet you soon!",
  },
  {
    id: "website-launch",
    name: "Heartverse · Website launch",
    channel: "Email",
    subject: "You’re invited into the Heartverse",
    body: "Hi {{first_name}},\n\nIt's been a while! I wanted to share something I've been pouring my heart into over the past year.\nYou may have heard that I made the decision to leave my corporate career to pursue music full time. Since then, I've been writing songs, creating music videos, performing live, and building something called the Heartverse.\nToday, I'm excited to finally invite you in.\nThe Heartverse is more than a website. It's a world built around the music, the stories, and the community.\nTo celebrate the launch, everyone can claim a free CHXNDLER Card. One randomly selected person will receive the Golden CHXNDLER Card and win a custom song that I'll write and produce just for them.\nWhether you've been following along from the beginning or we're just reconnecting, I'd love for you to be part of it.\n⭐️ Claim Your Free CHXNDLER Card → {{website}}\n\nThank you for taking a few minutes to read this. Building CHXNDLER has been one of the most rewarding experiences of my life, and I'm incredibly grateful to everyone who's supported me along the way.\n\nSee you inside. 🩷\n\n🎵 LISTEN: Spotify {{spotify_link}} | Apple {{apple_music_link}}\n⭐️ FOLLOW: Instagram {{instagram_link}} | TikTok {{tiktok_link}} | YouTube {{youtube_link}} | Facebook {{facebook_link}}\n\nP.S. If you know someone who might enjoy the Heartverse, I'd really appreciate you sharing this with them. Every new Alien helps us build this world together. 👽\n\n— {{sender_name}}",
  },
  {
    id: "booking-show-intro",
    name: "Booking · Show inquiry",
    channel: "Email",
    subject: "CHXNDLER · Booking inquiry for {{venue}}",
    body: "Hi {{contact_first_name}},\n\nMy name is {{sender_name}}, and I perform under the artist name CHXNDLER. I'm a friend of {{mutual_contact}}, and they thought we should connect.\n\nI recorded a short video to introduce myself, and I've attached my EPK so you can get a feel for the project.\n\nIntro Video: {{intro_video_link}}\n\nIf you have any upcoming dates that might be a good fit, I'd love to be considered for an upcoming show at {{venue}}.\n\nThanks for your time, and I hope to hear from you.\n\n{{website}}",
  },
  {
    id: "booking-show-venue",
    name: "Booking · Venue-specific",
    channel: "Email",
    subject: "CHXNDLER · Show inquiry for {{venue}}",
    body: "Hi {{venue}},\n\nMy name is {{sender_name}}, and I make music under the name CHXNDLER.\nI came to {{venue}} recently and really loved the atmosphere and sense of community. It felt like the kind of place where my project would fit in, so I wanted to reach out.\nI recorded a short video to introduce myself, and I've attached my one-page EPK so you can get a feel for what I do.\n\nIntro Video: {{intro_video_link}}\n\nIf you have any upcoming dates that you think could be a good fit, I'd love to be considered for a show.\nThanks for your time, and I hope to hear from you.\n\nBest,\n{{sender_name}} (CHXNDLER)\n{{website}}",
  },
  {
    id: "social-intro",
    name: "Social · Heartverse intro",
    channel: "Social / bio",
    body: "Aliens… welcome to the Heartverse.\n\nLive alt-pop, raw emotion, and real connection.\nIf you’ve ever felt like you don’t fully belong… you’re in the right place.\n\nJoin the world → {{website}}\nFollow to stay connected 🛸",
  },
];

const samples: Record<string, string> = {
  first_name: "Alex", contact_first_name: "Jason", sender_name: "Chandler", mutual_contact: "JP",
  band_name: "Recess", venue: "Mercury Lounge", city: "Brooklyn", website: "https://chxndler.world",
  music_link: "https://www.youtube.com/@chxndlerthealien", intro_video_link: "[Add intro video link]",
  spotify_link: "[Spotify link]", apple_music_link: "[Apple Music link]", instagram_link: "[Instagram link]",
  tiktok_link: "[TikTok link]", youtube_link: "https://www.youtube.com/@chxndlerthealien", facebook_link: "[Facebook link]",
};
const inputClass = "w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2 text-sm text-white";

export default function OutreachTemplatesTab() {
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [values, setValues] = useState(samples);
  const [copied, setCopied] = useState(false);
  const template = templates.find(item => item.id === selectedId) || templates[0];
  const variables = useMemo(() => [...new Set(`${template.subject || ""}\n${template.body}`.match(/{{\s*([\w]+)\s*}}/g) || [])].map(match => match.replace(/[{}\s]/g, "")), [template]);
  const render = (value: string) => value.replace(/{{\s*([\w]+)\s*}}/g, (_match, key: string) => values[key] ?? `{{${key}}}`);
  const subject = template.subject ? render(template.subject) : "";
  const body = render(template.body);
  async function copyDraft() {
    await navigator.clipboard?.writeText(`${subject ? `${subject}\n\n` : ""}${body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  function resetSample() { setValues(samples); }

  return <section className="grid gap-5 lg:grid-cols-[minmax(15rem,.7fr)_minmax(0,1.3fr)]">
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-white/55">MESSAGE TEMPLATE
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className={`${inputClass} mt-1`}>
          {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <p className="text-xs text-white/40">{template.channel} · {templates.length} ready-to-use drafts</p>
      <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Test with sample details</h3><button type="button" onClick={resetSample} className="text-xs text-[#FD52AF]">Reset samples</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{variables.map(key => <label key={key} className="block text-xs capitalize text-white/45">{key.replaceAll("_", " ")}<input value={values[key] ?? ""} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} className={`${inputClass} mt-1`}/></label>)}</div>
        <p className="mt-3 text-[.68rem] text-white/35">Changing these values updates the preview instantly. This is a local preview; it won’t send or log a message.</p>
      </div>
    </div>
    <div className="min-w-0 rounded-xl border border-white/[.08] bg-[#101014] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[.62rem] font-bold uppercase tracking-[.15em] text-[#ff78ba]">Preview · {template.channel}</p><h3 className="mt-1 text-base font-bold">{template.name}</h3></div><button type="button" onClick={() => void copyDraft()} className="rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-black">{copied ? "Copied" : "Copy draft"}</button></div>
      {subject && <div className="mb-3 rounded-lg bg-white/[.04] px-3 py-2"><p className="text-[.62rem] uppercase tracking-wide text-white/35">Subject</p><p className="mt-1 text-sm font-semibold text-white/85">{subject}</p></div>}
      <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-white/75">{body}</pre>
    </div>
  </section>;
}
