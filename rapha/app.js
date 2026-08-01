const root = document.querySelector("#report");
const MIN_SHORTLIST_DISCOUNT_PCT = 10;

const escapeHtml = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
const money = (value) => value === null || value === undefined || value === ""
  ? "—"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
const number = (value) => new Intl.NumberFormat("en-US").format(Number(value ?? 0));
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

function offerRows(offers, tableId) {
  return offers.map((offer) => `
    <tr data-page-row="${tableId}" data-region="${escapeHtml(offer.state || "")}" data-color="${escapeHtml(offer.color || "")}" data-source="${escapeHtml(offer.source || "")}" class="${offer.is_new_offer ? "new-offer" : ""}">
      <td class="price">${money(offer.sale_price_usd)}</td>
      <td>${money(offer.msrp_usd)}<small>${offer.discount_pct ? `低 ${escapeHtml(offer.discount_pct)}%` : "无折扣基准"}</small></td>
      <td>${escapeHtml(offer.color)}</td>
      <td>${escapeHtml(offer.size)}</td>
      <td>${escapeHtml(offer.source === "rapha_locally_widget" ? offer.retailer : "Trek US online")}</td>
      <td class="mono">${escapeHtml(offer.sku)}</td>
      <td class="mono">${escapeHtml(offer.upc)}</td>
      <td class="first-seen">${escapeHtml(offer.first_seen_date || "—")}${offer.is_new_offer ? '<span class="new-badge">本次新增</span>' : ""}</td>
      <td><a href="${safeUrl(offer.url)}" target="_blank" rel="noreferrer">查看</a></td>
    </tr>`).join("");
}

function paginationControls(tableId, offers) {
  const regions = [...new Set(offers.map((offer) => offer.state).filter(Boolean))].sort();
  const colors = [...new Set(offers.map((offer) => offer.color).filter(Boolean))].sort();
  const regionOptions = regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("");
  return `<div class="table-pagination" data-pagination="${tableId}">
    <label>Region <select data-region-filter="${tableId}"><option value="">All</option>${regionOptions}</select></label>
    <label>颜色 <select data-color-filter="${tableId}"><option value="">全部</option>${colors.map((color) => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`).join("")}</select></label>
    <label>每页 <select data-page-size="${tableId}"><option value="5">5</option><option value="10" selected>10</option><option value="20">20</option></select> 条</label>
    <span class="pagination-status" data-pagination-status="${tableId}">显示 1–${Math.min(10, offers.length)} / ${offers.length}</span>
    <button type="button" data-page-prev="${tableId}">上一页</button>
    <button type="button" data-page-next="${tableId}">下一页</button>
  </div>`;
}

function enablePagination() {
  root.querySelectorAll("[data-pagination]").forEach((controls) => {
    const tableId = controls.dataset.pagination;
    const rows = [...root.querySelectorAll(`tr[data-page-row="${tableId}"]`)];
    const region = controls.querySelector("[data-region-filter]");
    const color = controls.querySelector("[data-color-filter]");
    const select = controls.querySelector("[data-page-size]");
    const status = controls.querySelector("[data-pagination-status]");
    const previous = controls.querySelector("[data-page-prev]");
    const next = controls.querySelector("[data-page-next]");
    let page = 1;
    const update = () => {
      const size = Number(select.value);
      const filtered = rows.filter((row) =>
        (!region.value || row.dataset.region === region.value)
        && (!color.value || row.dataset.color === color.value),
      );
      const pages = Math.max(1, Math.ceil(filtered.length / size));
      page = Math.min(page, pages);
      const start = (page - 1) * size;
      const end = Math.min(start + size, filtered.length);
      rows.forEach((row) => { const index = filtered.indexOf(row); row.hidden = index < start || index >= end; });
      status.textContent = filtered.length ? `显示 ${start + 1}–${end} / ${filtered.length}` : "没有符合条件的报价";
      previous.disabled = page === 1;
      next.disabled = page === pages;
    };
    select.addEventListener("change", () => { page = 1; update(); });
    region.addEventListener("change", () => { page = 1; update(); });
    color.addEventListener("change", () => { page = 1; update(); });
    previous.addEventListener("click", () => { page -= 1; update(); });
    next.addEventListener("click", () => { page += 1; update(); });
    update();
  });
}

function modelSection(model, offers) {
  const all = [...offers].sort((left, right) => Number(left.sale_price_usd) - Number(right.sale_price_usd));
  const deals = all.filter((offer) => Number(offer.discount_pct ?? 0) >= MIN_SHORTLIST_DISCOUNT_PCT);
  const lowest = deals[0];
  const tableId = `offers-${model.replace(/[^a-z0-9]+/gi, "-")}`;
  return `<section class="panel model">
    <div class="section-heading"><div><h2>${escapeHtml(model)}</h2><p>在线有货 ${number(all.length)} 个 SKU · 短列表显示折扣至少 ${MIN_SHORTLIST_DISCOUNT_PCT}% 的 ${number(deals.length)} 个</p></div>
      ${lowest ? `<div class="minimum"><span>最低在线价</span><strong>${money(lowest.sale_price_usd)}</strong><small>MSRP ${money(lowest.msrp_usd)} · 低 ${escapeHtml(lowest.discount_pct)}%</small></div>` : ""}
    </div>
    ${deals.length ? paginationControls(tableId, deals) : ""}
    <div class="table-scroll"><table><thead><tr><th>价格</th><th>MSRP / 折扣</th><th>颜色</th><th>尺码</th><th>来源 / 门店</th><th>SKU</th><th>UPC</th><th>首次发现此价格</th><th></th></tr></thead>
      <tbody>${deals.length ? offerRows(deals, tableId) : `<tr><td colspan="9" class="empty">本次没有在线或本地有货且折扣至少 ${MIN_SHORTLIST_DISCOUNT_PCT}% 的 SKU。</td></tr>`}</tbody></table></div>
  </section>`;
}

function render(report) {
  const coverage = report.coverage;
  const complete = report.status === "COMPLETE";
  const byModel = new Map();
  for (const offer of report.offers) {
    const current = byModel.get(offer.canonical_name) || [];
    current.push(offer);
    byModel.set(offer.canonical_name, current);
  }
  document.title = `Rapha at Trek US · ${report.report_date}`;
  const sizes = coverage.allowed_sizes?.join(", ") || "M";
  const localQueryErrors = coverage.local_query_errors ?? coverage.local_failed_queries ?? 0;
  const localDetailFailures = coverage.local_detail_validation_failures ?? 0;
  const localUnpriced = coverage.local_unpriced_stock_observations
    ?? Math.max(0, Number(coverage.local_stocked_store_variant_pairs ?? 0) - Number(coverage.local_price_verified_offers ?? 0));
  root.innerHTML = `<header class="report-header"><div><p class="eyebrow">BIKE PRICE ALERTS · RAPHA AT TREK US</p><h1>Rapha 男款价格监控</h1><p class="muted mono">${escapeHtml(report.report_date)}</p></div><div class="status ${complete ? "complete" : "partial"}"><strong>${escapeHtml(report.status || "PARTIAL")} · ONLINE + LOCAL</strong><small>官网与公开 Locally 门店验证</small></div></header>
    <section class="summary-grid" aria-label="扫描摘要"><article><span>已选商品</span><strong>${number(coverage.configured_products)}</strong><small>男款 Rapha · ${escapeHtml(sizes)}</small></article><article><span>产品 API</span><strong>${number(coverage.successful_product_requests)}/${number(coverage.configured_products)}</strong><small>失败 ${number(coverage.failed_product_requests)}</small></article><article><span>官网在线 SKU</span><strong>${number(coverage.online_in_stock_skus)}</strong><small>仅尺码 ${escapeHtml(sizes)}</small></article><article><span>Locally 已验证报价</span><strong>${number(coverage.local_price_verified_offers)}</strong><small>发现库存 ${number(coverage.local_stocked_store_variant_pairs)} · 未验价 ${number(localUnpriced)} · 饱和 ${number(coverage.local_saturated_queries)} · 详情校验 ${number(localDetailFailures)} · 查询失败 ${number(localQueryErrors)}</small></article></section>
    <section class="method-note"><strong>数据口径</strong><p>官网报价来自 Trek US；本地报价来自 Locally 的精确 SKU、在库与门店价格验证。仅纳入尺码 ${escapeHtml(sizes)}；任何 Locally 饱和查询均为覆盖缺口，不会被当成无库存。</p></section>
    <div class="model-stack">${report.target_models.map((model) => modelSection(model, byModel.get(model) || [])).join("")}</div>
    <footer><div><strong>报告生成 ${escapeHtml(report.generated_at)}</strong><span>购买前请在 Trek 结账页复核库存、颜色、尺码和价格。</span></div><nav><a href="./latest-report.md" download>下载 Markdown</a><a href="./latest-report.json" download>下载 JSON</a><a href="../">Trek 报告</a></nav></footer>`;
  enablePagination();
}

fetch("./latest-report.json", { cache: "no-store" }).then((response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(render).catch((error) => {
  root.innerHTML = `<section class="load-error"><h1>报告暂时不可用</h1><p>${escapeHtml(error.message)}</p></section>`;
});
