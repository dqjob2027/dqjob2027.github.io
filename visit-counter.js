(() => {
  const visitCount = document.getElementById("visitCount");
  if (!visitCount || visitCount.dataset.started) return;
  visitCount.dataset.started = "true";

  async function updateVisitCount() {
    const endpoint = "https://ubiquitous-platypus-3013b2.netlify.app/.netlify/functions/visit-count";

    for (const method of ["POST", "GET"]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "accept": "application/json" },
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) continue;
        const data = await response.json();
        const count = data.count;
        if (!Number.isSafeInteger(count) || count < 0) continue;

        visitCount.textContent = `${new Intl.NumberFormat("zh-CN").format(count)} 次`;
        try {
          localStorage.setItem("employmentVisitCount", String(count));
        } catch (error) {
          // A live count remains valid when browser storage is unavailable.
        }
        return;
      } catch (error) {
        // GET provides a read-only fallback when incrementing fails.
      } finally {
        clearTimeout(timeout);
      }
    }

    let lastCount = 0;
    try {
      lastCount = Number(localStorage.getItem("employmentVisitCount"));
    } catch (error) {
      lastCount = 0;
    }
    visitCount.textContent = Number.isSafeInteger(lastCount) && lastCount > 0
      ? `${new Intl.NumberFormat("zh-CN").format(lastCount)} 次（上次统计）`
      : "暂无法获取";
  }

  return updateVisitCount();
})();
