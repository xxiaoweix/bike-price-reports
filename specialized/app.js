const root = document.querySelector("#report");

const escapeHtml = (value) =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ],
  );

const money = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

const number = (value) => new Intl.NumberFormat("en-US").format(Number(value ?? 0));
const location = (offer) => [offer.city, offer.state].filter(Boolean).join(", ") || "—";

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

function offerRows(offers) {
  return offers
    .map(
      (offer) => `
        <tr>
          <td class="price">${money(offer.sale_price_usd)}</td>
          <td>${money(offer.msrp_usd)}<small>${offer.discount_pct ? `低 ${escapeHtml(offer.discount_pct)}%` : "—"}</small></td>
          <td>${escapeHtml(offer.retailer)}</td>
          <td>${escapeHtml(location(offer))}</td>
          <td>${escapeHtml(offer.color)}</td>
          <td>${escapeHtml(offer.size)}</td>
          <td class="mono">${escapeHtml(offer.sku)}</td>
          <td><a href="${safeUrl(offer.url)}" target="_blank" rel="noreferrer">查看</a></td>
        </tr>`,
    )
    .join("");
}

function modelSection(model, offers) {
  const sorted = [...offers].sort((left, right) => Number(left.sale_price_usd) - Number(right.sale_price_usd));
  const lowest = sorted[0];
  const sizes = [...new Set(sorted.map((offer) => offer.size).filter(Boolean))].join(", ") || "56, 58";
  return `
    <section class="panel model">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(model)}</h2>
          <p>目标尺码 ${escapeHtml(sizes)} · ${number(sorted.length)} 个有效公开报价</p>
        </div>
        ${
          lowest
            ? `<div class="minimum"><span>最低已验证公开报价</span><strong>${money(lowest.sale_price_usd)}</strong><small>MSRP ${money(lowest.msrp_usd)} · 低 ${escapeHtml(lowest.discount_pct || "0")}%</small></div>`
            : ""
        }
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th>价格</th><th>MSRP / 折扣</th><th>门店</th><th>地区</th><th>颜色</th><th>尺码</th><th>MPN</th><th></th></tr></thead>
          <tbody>${sorted.length ? offerRows(sorted) : '<tr><td colspan="8" class="empty">本次未发现可验证的公开报价。</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
}

function render(report) {
  const coverage = report.coverage;
  const offersByModel = new Map();
  for (const offer of report.offers) {
    const offers = offersByModel.get(offer.canonical_name) || [];
    offers.push(offer);
    offersByModel.set(offer.canonical_name, offers);
  }
  const warnings = report.warnings?.length ?? report.errors?.length ?? 0;
  document.title = `Specialized 美国本土价格扫描 · ${report.report_date || report.generated_at.slice(0, 10)}`;
  root.innerHTML = `
    <header class="report-header">
      <div><p class="eyebrow">BIKE PRICE ALERTS · SPECIALIZED</p><h1>美国本土价格扫描</h1><p class="muted mono">${escapeHtml(report.report_date || report.generated_at.slice(0, 10))}</p></div>
      <div class="status partial"><strong>PUBLIC DEALER COVERAGE</strong><small>不作全国最低价声明</small></div>
    </header>
    <section class="summary-grid" aria-label="扫描摘要">
      <article><span>官方库存扫描点</span><strong>${number(coverage.official_inventory_points)}</strong><small>美国本土覆盖种子</small></article>
      <article><span>发现的官方经销商</span><strong>${number(coverage.official_retailers_discovered)}</strong><small>官方库存接口返回</small></article>
      <article><span>可爬取 BRAIN 店面</span><strong>${number(coverage.brain_retailers_crawled)}</strong><small>展示精确 MPN 的公开店面</small></article>
      <article><span>有效报价组合</span><strong>${number(coverage.verified_offers)}</strong><small>单店抓取告警 ${number(warnings)}</small></article>
    </section>
    <section class="method-note"><strong>数据口径</strong><p>仅纳入 Specialized 官方库存接口返回的美国本土门店中，公开 BRAIN 店面可验证的“精确 MPN × 尺码 × 在库 × 价格”组合。单店无法访问会降低覆盖，不会被误写为全国最低价。</p></section>
    <div class="model-stack">${report.target_models.map((model) => modelSection(model, offersByModel.get(model) || [])).join("")}</div>
    <footer>
      <div><strong>报告生成 ${escapeHtml(report.generated_at)}</strong><span>购买前请向门店复核库存、颜色和尺码。</span></div>
      <nav><a href="./latest-report.md" download>下载 Markdown</a><a href="./latest-report.json" download>下载 JSON</a><a href="../">Trek 报告</a></nav>
    </footer>`;
}

fetch("./latest-report.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch((error) => {
    root.innerHTML = `<section class="load-error"><h1>报告暂时不可用</h1><p>${escapeHtml(error.message)}</p></section>`;
  });
