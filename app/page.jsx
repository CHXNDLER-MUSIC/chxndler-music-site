function JoinAliens() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const phone = form.phone.value;

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      alert("✅ Thanks Alien — you’ve joined the crew!");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("❌ Something went wrong. Try again!");
    }
  };

  return (
    <div className="absolute right-[12%] top-[42%] z-30 w-64 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
        Join the Aliens
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
        />
        <input
          name="phone"
          type="tel"
          placeholder="phone (optional)"
          className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-black hover:bg-white"
        >
          🚀 Join
        </button>
      </form>
    </div>
  );
}
