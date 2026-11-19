const releases = [
  { title: "GAME BOY HEART (ゲームボーイの心)", spotify: "https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF", upc: "199513634854", apple: "https://music.apple.com/us/album/game-boy-heart-%E3%82%B2%E3%83%BC%E3%83%A0%E3%83%9C%E3%83%BC%E3%82%A4%E3%81%AE%E5%BF%83/1826340576?i=1826340577" },
  { title: "KID FOREVER (永遠の子供)", spotify: "https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN", upc: "199513621168", apple: "https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337" },
  { title: "BRAIN FREEZE", spotify: "https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT", upc: "199516264522", apple: "https://music.apple.com/us/album/brain-freeze/1823925483?i=1823925484" },
  { title: "WE’RE JUST FRIENDS (mickey jas Remix)", spotify: "https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ", upc: "199095978704", apple: "https://music.apple.com/us/album/were-just-friends-mickey-jas-remix/1785153493?i=1785153499" },
  { title: "BE MY BEE", spotify: "https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr", upc: "199097084779", apple: "https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028" },
  { title: "WE’RE JUST FRIENDS", spotify: "https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y", upc: "197508953065", apple: "https://music.apple.com/us/album/were-just-friends/1662517763?i=1662517764" },
  { title: "PARIS", spotify: "https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut", upc: "198877034423", apple: "https://music.apple.com/us/album/paris/1779879728?i=1779879729" },
  { title: "POKÉMON", spotify: "https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk", upc: "199338892811", apple: "https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784" },
  { title: "ALIEN (House Party)", spotify: "https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4", upc: "198668852113", apple: "https://music.apple.com/us/album/alien-house-party/1757497439?i=1757497440" },
  { title: "WE’RE JUST FRIENDS (DMVRCO Remix)", spotify: "https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA", upc: "197727859407", apple: "https://music.apple.com/us/album/were-just-friends-dmvrco-remix/1680307531?i=1680307532" },
  { title: "BABY", spotify: "https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3", upc: "199517872245", apple: "https://music.apple.com/us/album/baby/1823220422?i=1823220423" },
  { title: "OCEAN GIRL", spotify: "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ", upc: "199509838990", apple: "https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199" },
  { title: "OCEAN GIRL (ACOUSTIC)", spotify: "https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275", upc: "", apple: "https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267" },
  { title: "OCEAN GIRL (REMIX)", spotify: "https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4", upc: "", apple: "https://music.apple.com/us/album/ocean-girl-remix-single/1830764323" },
  { title: "COLLIDE", spotify: "https://open.spotify.com/track/4CCfWIk6SDUwmcUvGvgVQG?si=2788de692cc3435d", upc: "", apple: "https://music.apple.com/us/album/collide/1814599250?i=1814599264" },
  { title: "COLORS OF OUR HOME", spotify: "", upc: "", apple: "" },
  { title: "COLORS OF OUR HOME (ACOUSTIC)", spotify: "", upc: "", apple: "" },
  { title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)", spotify: "", upc: "", apple: "" },
  { title: "ALONE", spotify: "", upc: "", apple: "" },
  { title: "ALONE (ACOUSTIC)", spotify: "", upc: "", apple: "" },
];

function ExternalLink({ href, label }: { href: string; label: string }) {
  return href ? <a href={href} target="_blank" rel="noreferrer">{label}</a> : <span className="discography-missing">—</span>;
}

export default function DiscographyPage() {
  return (
    <main className="discography-page">
      <header className="discography-header">
        <p className="discography-kicker">CHXNDLER · MUSIC</p>
        <h1>Discography</h1>
        <p>Listen across platforms and find release UPCs.</p>
      </header>
      <div className="discography-table-wrap" role="region" aria-label="Discography table" tabIndex={0}>
        <table className="discography-table">
          <thead><tr><th scope="col">Title</th><th scope="col">Spotify link</th><th scope="col">Spotify UPC</th><th scope="col">Apple Music URL</th></tr></thead>
          <tbody>{releases.map((release) => <tr key={release.title}>
            <th scope="row">{release.title}</th>
            <td><ExternalLink href={release.spotify} label="Listen on Spotify" /></td>
            <td className="discography-upc">{release.upc || <span className="discography-missing">—</span>}</td>
            <td><ExternalLink href={release.apple} label="Listen on Apple Music" /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <style>{`
        .discography-page { min-height: 100vh; padding: clamp(2rem, 6vw, 5rem); color: #fff; background: #09090d; font-family: inherit; }
        .discography-header { max-width: 76rem; margin: 0 auto 2rem; }
        .discography-kicker { color: #F2EF1D; font-size: .8rem; font-weight: 800; letter-spacing: .18em; }
        .discography-header h1 { margin: .5rem 0; font-size: clamp(2.5rem, 7vw, 5rem); line-height: 1; }
        .discography-header > p:last-child { color: #b9b9c3; font-size: 1.05rem; }
        .discography-table-wrap { max-width: 76rem; margin: auto; overflow-x: auto; border: 1px solid #30303a; border-radius: 1rem; background: #111117; }
        .discography-table { width: 100%; min-width: 58rem; border-collapse: collapse; text-align: left; }
        .discography-table th, .discography-table td { padding: 1rem 1.1rem; border-bottom: 1px solid #2a2a33; vertical-align: middle; }
        .discography-table thead th { position: sticky; top: 0; color: #F2EF1D; background: #191920; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; }
        .discography-table tbody th { font-size: .95rem; font-weight: 650; }
        .discography-table tbody tr:last-child th, .discography-table tbody tr:last-child td { border-bottom: 0; }
        .discography-table a { color: #38B6FF; text-decoration: underline; text-underline-offset: .2em; }
        .discography-table a:hover { color: #FC54AF; }
        .discography-upc { font-variant-numeric: tabular-nums; white-space: nowrap; }
        .discography-missing { color: #777782; }
        @media (max-width: 640px) { .discography-page { padding: 2rem 1rem; } .discography-table th, .discography-table td { padding: .85rem; } }
      `}</style>
    </main>
  );
}
