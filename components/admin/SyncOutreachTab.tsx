"use client";

import { useMemo, useState } from "react";

type OutreachSong = { song: string; emotion: string; category: string; movies: string; tv: string; anime: string; hook: string; scenes: string };

const outreach: OutreachSong[] = [
  {song:"WE'RE JUST FRIENDS",emotion:"Loving someone who might never choose you",category:"Unrequited Love",movies:"La La Land, 500 Days of Summer",tv:"The Office, New Girl",anime:"Your Name",hook:"Have you ever loved someone at the wrong time?",scenes:"Friends almost kissing, staring at each other, late night talks"},
  {song:"BE MY BEE",emotion:"Trust betrayed after opening your heart",category:"Heartbreak",movies:"Eternal Sunshine",tv:"Normal People",anime:"Toradora",hook:"The person I fell for never existed.",scenes:"First dates, betrayal reveals, text messages"},
  {song:"SOMEBODY TO LOVE",emotion:"Looking for a love that matches your soul",category:"Longing",movies:"Before Sunrise",tv:"How I Met Your Mother",anime:"Nana",hook:"Not all love stories are meant to last.",scenes:"Soulmate moments, walking together"},
  {song:"LOVE ME",emotion:"Fear you'll be abandoned if you fail",category:"Insecurity",movies:"Tick Tick Boom",tv:"Ted Lasso",anime:"Blue Period",hook:"Would you still love me if I never made it?",scenes:"Auditions, rejection, failure"},
  {song:"HOME",emotion:"Becoming your own safe place",category:"Self Acceptance",movies:"Good Will Hunting",tv:"Bluey",anime:"March Comes in Like a Lion",hook:"The person I was searching for was me.",scenes:"Looking in mirrors, leaving toxic relationships"},
  {song:"COLORS OF OUR HOME",emotion:"Love makes life brighter",category:"Safe Love",movies:"Up",tv:"Bob's Burgers",anime:"Your Name",hook:"You brought color back into my world.",scenes:"Before/after happiness scenes"},
  {song:"I MIGHT FALL IN LOVE WITH YOU",emotion:"Magic hidden inside ordinary life",category:"Nostalgic Love",movies:"About Time",tv:"Bluey",anime:"Whisper of the Heart",hook:"Love looks a lot like cartoons and pancakes.",scenes:"Cooking together, dancing in kitchen"},
  {song:"LOVE",emotion:"Pure connection",category:"Safe Love",movies:"Before Sunrise",tv:"Heartstopper",anime:"Horimiya",hook:"Nothing dramatic. Just love.",scenes:"Hand holding, laughing together"},
  {song:"I WOULD DIE FOR YOUR LOVE",emotion:"Complete devotion",category:"Intense Love",movies:"Titanic",tv:"Vampire Diaries",anime:"Clannad",hook:"Some people become your entire world.",scenes:"Sacrifice scenes"},
  {song:"ALONE",emotion:"Invisible in a crowded world",category:"Loneliness",movies:"Her",tv:"BoJack Horseman",anime:"A Silent Voice",hook:"Nobody noticed I was disappearing.",scenes:"Subway scenes, city walking alone"},
  {song:"LITTLE BLACK HEART",emotion:"Wondering when you stopped caring",category:"Emotional Numbness",movies:"Fight Club",tv:"Mr Robot",anime:"Welcome to NHK",hook:"When did I become this person?",scenes:"Looking exhausted, empty apartments"},
  {song:"AM I PRETTY WHEN I CRY",emotion:"Wanting to be loved despite flaws",category:"Vulnerability",movies:"Perks of Being a Wallflower",tv:"Euphoria",anime:"Orange",hook:"Would you still stay if you saw everything?",scenes:"Crying scenes, emotional breakdowns"},
  {song:"BLUE",emotion:"Missing someone while wishing them well",category:"Bittersweet Love",movies:"La La Land",tv:"HIMYM Finale",anime:"5 Centimeters Per Second",hook:"I hope you're happy. Even without me.",scenes:"Watching someone leave"},
  {song:"ALWAYS ON MY MIND",emotion:"Someone living inside your memories",category:"Memory & Grief",movies:"Coco",tv:"This Is Us",anime:"Violet Evergarden",hook:"Some people never really leave.",scenes:"Old photos, flashbacks"},
  {song:"TIENES UN AMIGO",emotion:"Finding family far from home",category:"Friendship",movies:"Stand By Me",tv:"Ted Lasso",anime:"One Piece",hook:"Sometimes home is another person.",scenes:"Best friend scenes"},
  {song:"HOUSE PARTY",emotion:"Feeling seen for the first time",category:"Belonging",movies:"Perks of Being a Wallflower",tv:"Freaks and Geeks",anime:"My Dress Up Darling",hook:"Then somebody looked at me differently.",scenes:"Outsider enters party"},
  {song:"MAKE BELIEVE",emotion:"Choosing belief over reality",category:"Dreamers",movies:"Walter Mitty",tv:"Adventure Time",anime:"Little Witch Academia",hook:"The impossible only exists until someone tries.",scenes:"Flying, dreaming, adventures"},
  {song:"KID FOREVER",emotion:"Refusing to become someone you're not",category:"Childhood Wonder",movies:"Peter Pan",tv:"Adventure Time",anime:"Pokémon",hook:"Growing older isn't the same as growing up.",scenes:"Playing, imagination scenes"},
  {song:"GAME BOY HEART",emotion:"Escaping adulthood through fantasy",category:"Childhood Wonder",movies:"Ready Player One",tv:"Pokémon",anime:"Digimon",hook:"Reality wasn't enough.",scenes:"Gaming scenes, adventures"},
  {song:"POKÉMON",emotion:"Wonder and adventure",category:"Adventure",movies:"Detective Pikachu",tv:"Pokémon",anime:"Pokémon",hook:"The world felt bigger back then.",scenes:"Journey scenes"},
  {song:"WHAT'S MY AGE AGAIN",emotion:"Rejecting adulthood",category:"Rebellion",movies:"Superbad",tv:"Regular Show",anime:"FLCL",hook:"Nobody told me I had to stop having fun.",scenes:"Chaos, pranks"},
  {song:"LETTING GO",emotion:"Escaping expectations",category:"Freedom",movies:"Into The Wild",tv:"Adventure Time",anime:"One Piece",hook:"The hardest thing to let go of was who I thought I was supposed to be.",scenes:"Quitting jobs, running away"},
  {song:"AMERICAN DREAM",emotion:"Rejecting society's script",category:"Freedom",movies:"Office Space",tv:"Severance",anime:"Zom 100",hook:"What if success isn't what they told us?",scenes:"Office scenes, resignations"},
  {song:"OCEAN GIRL",emotion:"Letting go and trusting",category:"Freedom & Love",movies:"The Notebook",tv:"Outer Banks",anime:"Ride Your Wave",hook:"If it's meant for you, it'll return.",scenes:"Ocean, sunsets, departures"},
  {song:"PINK MOON",emotion:"Someone giving you a reason to stay alive",category:"Recovery",movies:"Silver Linings Playbook",tv:"BoJack Horseman",anime:"A Silent Voice",hook:"You didn't save me. You gave me a reason to try.",scenes:"Recovery scenes"},
  {song:"PARIS",emotion:"Romanticizing destruction",category:"Darkness",movies:"Trainspotting",tv:"Euphoria",anime:"Nana",hook:"Some memories are beautiful because they're over.",scenes:"Party scenes, self destruction"},
  {song:"CHEERLEADER",emotion:"Wanting support from someone important",category:"Family Conflict",movies:"Lady Bird",tv:"Gilmore Girls",anime:"Fruits Basket",hook:"The people we need most don't always understand us.",scenes:"Parent child arguments"},
  {song:"FEELING THIS",emotion:"Brief intense connection",category:"Passion",movies:"Before Sunrise",tv:"Skins",anime:"Nana",hook:"Some people change your life in a single night.",scenes:"Fast romance scenes"},
  {song:"EMO GIRL",emotion:"Reckless attraction",category:"Chaos",movies:"Scott Pilgrim",tv:"Skins",anime:"FLCL",hook:"I knew it was a bad idea.",scenes:"Wild romance"},
  {song:"HOLY",emotion:"Seeing someone as sacred",category:"Reverence",movies:"The Notebook",tv:"Heartstopper",anime:"Your Lie in April",hook:"Some people feel like religion.",scenes:"Slow romantic moments"},
  {song:"I LIKE ME BETTER",emotion:"Becoming better because of love",category:"Growth",movies:"About Time",tv:"New Girl",anime:"Horimiya",hook:"You helped me become myself.",scenes:"Personal growth montages"},
  {song:"SUGAR WE'RE GOING DOWN",emotion:"Self destruction + obsession",category:"Obsession",movies:"Donnie Darko",tv:"Skins",anime:"Death Note",hook:"I knew I'd regret it.",scenes:"Chaotic relationship scenes"},
  {song:"YOU FEEL IT",emotion:"Empathy for suffering",category:"Compassion",movies:"Okja",tv:"Bluey",anime:"Wolf Children",hook:"If they could talk, what would they say?",scenes:"Animal rescue scenes"},
];

const columns: {key:keyof OutreachSong; label:string}[] = [
  {key:"song",label:"Song"},{key:"emotion",label:"Core emotion"},{key:"category",label:"Big category"},{key:"movies",label:"Movies"},{key:"tv",label:"TV / cartoons"},{key:"anime",label:"Anime"},{key:"hook",label:"Text hooks"},{key:"scenes",label:"Scenes to search"},
];

export default function SyncOutreachTab() {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? outreach.filter(row => Object.values(row).some(value => value.toLowerCase().includes(term))) : outreach;
  }, [query]);

  return <section>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Sync licensing</p><h2 className="mt-1 text-2xl font-black">Outreach ideas</h2><p className="mt-2 text-sm text-white/50">Match songs with scene contexts, reference titles, and short-form text hooks.</p></div>
      <span className="text-xs text-white/45">{visible.length} of {outreach.length} songs</span>
    </div>
    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search songs, emotions, references, hooks…" className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30" />
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
        <thead className="bg-white/[.06] text-[.65rem] uppercase tracking-[.12em] text-white/55"><tr>{columns.map(column => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr></thead>
        <tbody>{visible.map((row, index) => <tr key={row.song} className={index % 2 ? "bg-white/[.015]" : ""}>{columns.map(column => <td key={column.key} className={`border-t border-white/[.07] px-4 py-3 align-top ${column.key === "song" ? "min-w-44 font-bold text-white" : "min-w-36 text-white/70"}`}>{row[column.key]}</td>)}</tr>)}</tbody>
      </table>
      {!visible.length && <p className="p-8 text-center text-sm text-white/45">No matches. Try another search.</p>}
    </div>
  </section>;
}
