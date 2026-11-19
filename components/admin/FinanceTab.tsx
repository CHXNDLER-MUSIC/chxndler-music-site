type FinanceItem = { category: "Software" | "Merch" | "Advertising"; company: string; item: string; website: string; quantity: string; description: string; cost: number | null };

const items: FinanceItem[] = [
  { category: "Software", company: "Go Daddy", item: "Domain name", website: "https://chxndler-music.com", quantity: "Per Year", description: ".COM Domain Registration (11.99), full domain protection (9.99)", cost: 47 },
  { category: "Software", company: "Go Daddy", item: "Email", website: "mailto:info@chxndler-music.com", quantity: "Per Year", description: "Microsoft 365 Email Essentials From GoDaddy", cost: 24 },
  { category: "Software", company: "Google", item: "File Management", website: "https://drive.google.com/drive/u/0/", quantity: "Per Month", description: "", cost: 25 },
  { category: "Software", company: "Distrokid", item: "Artist profile", website: "https://distrokid.com", quantity: "Per Year", description: "Musician Plus", cost: 36 },
  { category: "Software", company: "CapCut", item: "Video Editor", website: "", quantity: "Per Month", description: "", cost: 11 },
  { category: "Software", company: "Mailchimp", item: "Email Template", website: "https://mailchimp.com", quantity: "", description: "Dropbox Plus (2,000 GB storage)", cost: 0 },
  { category: "Merch", company: "Staples", item: "CHXNDLER CARDS", website: "https://www.staples.com", quantity: "100", description: "# of sheets", cost: 153 },
  { category: "Merch", company: "Sticker Mule", item: "PIN", website: "https://www.stickermule.com", quantity: "50", description: "", cost: 31 },
  { category: "Merch", company: "Connectyle", item: "Beanie", website: "https://www.amazon.com/dp/B07YSTXVMV?ref_=ppx_hzsearch_conn_dt_b_fed_asin_title_1&th=1&psc=1", quantity: "20", description: "", cost: 9 },
  { category: "Merch", company: "customembroiderydigi", item: "PATCH", website: "https://www.etsy.com/listing/1376588618/custom-embroidered-patches-your-own", quantity: "30", description: "", cost: 69 },
  { category: "Merch", company: "Sticker Mule", item: "Sticker", website: "https://www.stickermule.com", quantity: "50", description: "", cost: 31 },
  { category: "Merch", company: "", item: "Hat", website: "", quantity: "", description: "", cost: null },
  { category: "Merch", company: "Sticker Mule", item: "Keychain", website: "https://www.stickermule.com", quantity: "10", description: "", cost: 23 },
  { category: "Merch", company: "Sticker Mule", item: "House Party Poster", website: "https://www.stickermule.com", quantity: "1", description: '18" x 24"', cost: 27 },
  { category: "Merch", company: "Ball Chain", item: "Necklace (Chain)", website: "https://www.ballchain.com", quantity: "100", description: "", cost: 46 },
  { category: "Merch", company: "Sticker Mule", item: "Necklace (Charm)", website: "https://www.stickermule.com", quantity: "50", description: "", cost: 56 },
  { category: "Merch", company: "Sticker Mule", item: "Button", website: "https://www.stickermule.com", quantity: "50", description: '1.25"', cost: 20 },
  { category: "Merch", company: "", item: "Bracelet", website: "", quantity: "", description: "", cost: null },
  { category: "Merch", company: "Wilmington Fibre Specialty Company", item: "Pick", website: "", quantity: "100", description: "", cost: 57 },
  { category: "Advertising", company: "Facebook/Instagram Ads", item: "", website: "", quantity: "", description: "", cost: null },
  { category: "Advertising", company: "TikTok Ads", item: "", website: "", quantity: "", description: "", cost: null },
];
const categories = ["Software", "Merch", "Advertising"] as const;
const money = (value: number) => `$${value.toLocaleString("en-US")}`;

export default function FinanceTab() {
  const software = items.filter((item) => item.category === "Software");
  const annualSoftware = software.filter((item) => item.quantity === "Per Year").reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const monthlySoftware = software.filter((item) => item.quantity === "Per Month").reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const merchTotal = items.filter((item) => item.category === "Merch").reduce((sum, item) => sum + (item.cost ?? 0), 0);

  return <section className="space-y-6 text-white">
    <header><p className="text-xs font-bold tracking-[.25em] text-[#ff3ea5]">STUDIO COSTS</p><h2 className="mt-2 text-2xl font-black">Finance</h2><p className="mt-2 text-sm text-white/55">Software subscriptions, merch inventory, and advertising costs.</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <Summary label="Software · annual" value={`${money(annualSoftware)} / year`} />
      <Summary label="Software · monthly" value={`${money(monthlySoftware)} / month`} />
      <Summary label="Merch costs listed" value={`${money(merchTotal)} total`} />
    </div>
    {categories.map((category) => {
      const rows = items.filter((item) => item.category === category);
      return <section key={category} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.03]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h3 className="font-bold">{category}</h3><span className="text-xs text-white/45">{rows.length} items</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-white/40"><tr><th className="px-4 py-3 font-semibold">Company</th><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Website</th><th className="px-4 py-3 font-semibold">Quantity</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 text-right font-semibold">$</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.item}-${index}`} className="border-t border-white/[.07] align-top">
            <td className="px-4 py-3 text-white/75">{row.company || "—"}</td><td className="px-4 py-3 font-medium">{row.item || "—"}</td>
            <td className="max-w-48 px-4 py-3">{row.website ? <a href={row.website} target="_blank" rel="noreferrer" className="break-all text-[#ff78bd] hover:underline">{row.website.replace(/^https?:\/\//, "")}</a> : <span className="text-white/35">—</span>}</td>
            <td className="px-4 py-3 text-white/65">{row.quantity || "—"}</td><td className="max-w-64 px-4 py-3 text-white/55">{row.description || "—"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{row.cost === null ? "—" : money(row.cost)}</td>
          </tr>)}</tbody>
        </table></div>
      </section>;
    })}
    <p className="text-xs text-white/40">Amounts and frequencies reflect the provided list. Blank entries are shown as —.</p>
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs text-white/45">{label}</p><p className="mt-2 text-xl font-bold tabular-nums">{value}</p></div>;
}
