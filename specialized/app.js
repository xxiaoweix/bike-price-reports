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
const MIN_SHORTLIST_DISCOUNT_PCT = 10;

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

function offerRows(offers, tableId) {
  return offers
    .map(
      (offer) => `
        <tr data-page-row="${tableId}" data-region="${escapeHtml(offer.state || "")}" data-color="${escapeHtml(offer.color || "")}" class="${offer.is_new_offer ? "new-offer" : ""}">
          <td class="price">${money(offer.sale_price_usd)}</td>
          <td>${money(offer.msrp_usd)}<small>${offer.discount_pct ? `低 ${escapeHtml(offer.discount_pct)}%` : "—"}</small></td>
          <td>${escapeHtml(offer.retailer)}</td>
          <td>${escapeHtml(location(offer))}</td>
          <td>${escapeHtml(offer.color)}</td>
          <td>${escapeHtml(offer.size)}</td>
          <td class="mono">${escapeHtml(offer.sku)}</td>
          <td class="first-seen">${escapeHtml(offer.first_seen_date || "—")}${offer.is_new_offer ? '<span class="new-badge">本次新增</span>' : ""}</td>
          <td><a href="${safeUrl(offer.url)}" target="_blank" rel="noreferrer">查看</a></td>
        </tr>`,
    )
    .join("");
}

function paginationControls(tableId, offers) {
  const regions = [...new Set(offers.map((offer) => offer.state).filter(Boolean))].sort();
  const colors = [...new Set(offers.map((offer) => offer.color).filter(Boolean))].sort();
  const regionOptions = regions
    .map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
    .join("");
  const colorOptions = colors
    .map((color) => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`)
    .join("");
  const count = offers.length;
  return `
    <div class="table-pagination" data-pagination="${tableId}">
      <label>Color
        <select data-color-filter="${tableId}">
          <option value="">All</option>${colorOptions}
        </select>
      </label>
      <label>地区
        <select data-region-filter="${tableId}">
          <option value="">全部</option>${regionOptions}
        </select>
      </label>
      <label>每页
        <select data-page-size="${tableId}">
          <option value="5">5</option>
          <option value="10" selected>10</option>
          <option value="20">20</option>
        </select>
        条
      </label>
      <span class="pagination-status" data-pagination-status="${tableId}">显示 1–${Math.min(10, count)} / ${count}</span>
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
      const pageSize = Number(select.value);
      const filteredRows = rows.filter(
        (row) => (!region.value || row.dataset.region === region.value)
          && (!color.value || row.dataset.color === color.value),
      );
      const filteredIndexes = new Map(
        filteredRows.map((row, index) => [row, index]),
      );
      const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
      page = Math.min(page, totalPages);
      const start = (page - 1) * pageSize;
      const end = Math.min(start + pageSize, filteredRows.length);
      rows.forEach((row, index) => {
        const filteredIndex = filteredIndexes.get(row);
        row.hidden = filteredIndex === undefined || filteredIndex < start || filteredIndex >= end;
      });
      status.textContent = filteredRows.length
        ? `显示 ${start + 1}–${end} / ${filteredRows.length}`
        : "没有符合条件的报价";
      previous.disabled = page === 1;
      next.disabled = page === totalPages;
    };
    region.addEventListener("change", () => {
      page = 1;
      update();
    });
    color.addEventListener("change", () => {
      page = 1;
      update();
    });
    select.addEventListener("change", () => {
      page = 1;
      update();
    });
    previous.addEventListener("click", () => {
      page -= 1;
      update();
    });
    next.addEventListener("click", () => {
      page += 1;
      update();
    });
    update();
  });
}

function modelSection(model, offers) {
  const allOffers = [...offers].sort((left, right) => Number(left.sale_price_usd) - Number(right.sale_price_usd));
  const shortlist = allOffers.filter((offer) => Number(offer.discount_pct ?? 0) >= MIN_SHORTLIST_DISCOUNT_PCT);
  const lowest = shortlist[0];
  const tableId = `offers-${model.replace(/[^a-z0-9]+/gi, "-")}`;
  const sizes = [...new Set(allOffers.map((offer) => offer.size).filter(Boolean))].join(", ") || "56, 58";
  return `
    <section class="panel model">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(model)}</h2>
          <p>目标尺码 ${escapeHtml(sizes)} · 全部 ${number(allOffers.length)} 个有效公开报价 · 短列表仅显示 MSRP 低至少 ${MIN_SHORTLIST_DISCOUNT_PCT}% 的 ${number(shortlist.length)} 个</p>
        </div>
        ${
          lowest
            ? `<div class="minimum"><span>最低已验证公开报价</span><strong>${money(lowest.sale_price_usd)}</strong><small>MSRP ${money(lowest.msrp_usd)} · 低 ${escapeHtml(lowest.discount_pct || "0")}%</small></div>`
            : ""
        }
      </div>
      ${shortlist.length ? paginationControls(tableId, shortlist) : ""}
      <div class="table-scroll">
        <table>
          <thead><tr><th>价格</th><th>MSRP / 折扣</th><th>门店</th><th>地区</th><th>颜色</th><th>尺码</th><th>MPN</th><th>首次发现</th><th></th></tr></thead>
          <tbody>${shortlist.length ? offerRows(shortlist, tableId) : `<tr><td colspan="9" class="empty">有已验证报价，但本次没有 MSRP 折扣达到 ${MIN_SHORTLIST_DISCOUNT_PCT}% 的优惠。全部已验证报价仍可在 JSON/Markdown 下载中查看。</td></tr>`}</tbody>
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
  const discoveredStates = coverage.official_discovered_state_codes ?? [];
  const missingStates = coverage.missing_official_state_codes ?? [];
  document.title = `Specialized 美国本土价格扫描 · ${report.report_date || report.generated_at.slice(0, 10)}`;
  root.innerHTML = `
    <header class="report-header">
      <div><p class="eyebrow">BIKE PRICE ALERTS · SPECIALIZED</p><h1>美国本土价格扫描</h1><p class="muted mono">${escapeHtml(report.report_date || report.generated_at.slice(0, 10))}</p></div>
      <div class="status partial"><strong>PUBLIC DEALER COVERAGE</strong><small>不作全国最低价声明</small></div>
    </header>
    <section class="summary-grid" aria-label="扫描摘要">
      <article><span>目标库存州/DC</span><strong>${number(discoveredStates.length)}/49</strong><small>${missingStates.length ? `未返回：${escapeHtml(missingStates.join(", "))}` : "所有州/DC 均返回目标库存"}</small></article>
      <article><span>发现的官方经销商</span><strong>${number(coverage.official_retailers_discovered)}</strong><small>官方库存接口返回</small></article>
      <article><span>可搜索店面 host</span><strong>${number(coverage.searchable_storefront_hosts ?? coverage.brain_retailers_crawled)}</strong><small>BRAIN 搜索页返回成功；不等同于已验证 MPN</small></article>
      <article><span>有效报价组合</span><strong>${number(coverage.verified_offers)}</strong><small>官方查询 ${number(coverage.official_inventory_queries)}（失败 ${number(coverage.failed_official_inventory_queries)}）· 尝试 host ${number(coverage.storefront_attempted_hosts)} · 告警 host ${number(coverage.warning_storefront_hosts ?? warnings)}</small></article>
    </section>
    <section class="method-note"><strong>数据口径</strong><p>仅纳入 Specialized 官方库存接口发现的美国本土门店中，可由公开店面验证“精确 MPN × 尺码 × 在库 × 价格”的组合。官方接口每次查询的结果可能触顶；公开店面无法访问、或不使用兼容搜索路径，都会降低价格验证覆盖。因此此报告不作全国最低价声明。</p></section>
    <div class="model-stack">${report.target_models.map((model) => modelSection(model, offersByModel.get(model) || [])).join("")}</div>
    <footer>
      <div><strong>报告生成 ${escapeHtml(report.generated_at)}</strong><span>购买前请向门店复核库存、颜色和尺码。</span></div>
      <nav><a href="./latest-report.md" download>下载 Markdown</a><a href="./latest-report.json" download>下载 JSON</a><a href="../">Trek 报告</a></nav>
    </footer>`;
  enablePagination();
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
