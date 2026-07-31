const root = document.querySelector("#report");

const escapeHtml = (value) =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );

const money = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(value));

const number = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value ?? 0));

const location = (listing) =>
  [listing.city, listing.state].filter(Boolean).join(", ") || "—";

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

const changeLabel = (kind) =>
  ({
    new_offer: "新增库存",
    price_drop: "降价",
    price_increase: "涨价",
    offer_disappeared: "库存消失",
  })[kind] || kind;

function offerRows(offers, tableId) {
  return offers
    .map(
      (offer) => `
        <tr data-page-row="${tableId}" data-region="${escapeHtml(offer.state || "")}" data-color="${escapeHtml(offer.color || "")}" class="${offer.is_new_offer ? "new-offer" : ""}">
          <td class="price">${money(offer.sale_price_usd)}</td>
          <td>
            ${money(offer.msrp_usd)}
            <small>${offer.discount_pct ? `低 ${escapeHtml(offer.discount_pct)}%` : "—"}</small>
          </td>
          <td>${escapeHtml(offer.retailer)}</td>
          <td>${escapeHtml(location(offer))}</td>
          <td>${escapeHtml(offer.color)}</td>
          <td>${escapeHtml(offer.size)}</td>
          <td class="mono">${escapeHtml(offer.upc)}</td>
          <td class="first-seen">
            ${escapeHtml(offer.first_seen_date)}
            ${offer.is_new_offer ? '<span class="new-badge">本次新增</span>' : ""}
          </td>
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

function modelSection(model) {
  const lowest = model.shortlist_lowest;
  const tableId = `offers-${model.model_key}`;
  const offers = model.top_offers;
  return `
    <section class="panel model">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(model.canonical_name)}</h2>
          <p>
            目标尺码 ${escapeHtml(model.target_sizes.join(", "))} ·
            ${number(model.store_count)} 家门店 ·
            ${number(model.offer_count)} 个有效报价组合 · 五个最低不同价格档位中仅展示折扣至少 10% 的报价
          </p>
        </div>
        ${
          lowest
            ? `<div class="minimum">
                <span>短名单最低已验证价格</span>
                <strong>${money(lowest.sale_price_usd)}</strong>
                <small>MSRP ${money(lowest.msrp_usd)} · 低 ${escapeHtml(lowest.discount_pct || "0")}%</small>
              </div>`
            : ""
        }
      </div>
      ${offers.length ? paginationControls(tableId, offers) : ""}
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>价格</th><th>MSRP / 折扣</th><th>门店</th><th>地区</th>
              <th>颜色</th><th>尺码</th><th>UPC</th><th>首次发现</th><th></th>
            </tr>
          </thead>
          <tbody>${offers.length ? offerRows(offers, tableId) : '<tr><td colspan="9" class="empty">本次没有折扣达到 10% 的已验证报价。</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
}

function changeRows(changes) {
  return changes
    .map((change) => {
      const listing = change.listing;
      const price =
        change.old_price_usd && change.new_price_usd
          ? `${money(change.old_price_usd)} → ${money(change.new_price_usd)}`
          : money(listing.sale_price_usd);
      return `
        <tr>
          <td>${escapeHtml(changeLabel(change.kind))}</td>
          <td>${escapeHtml(listing.canonical_name)}</td>
          <td>${escapeHtml(listing.retailer)}</td>
          <td>${escapeHtml(location(listing))}</td>
          <td>${escapeHtml(listing.color)} / ${escapeHtml(listing.size)}</td>
          <td class="mono">${price}</td>
        </tr>`;
    })
    .join("");
}

function comparisonCopy(comparison) {
  if (comparison.status === "compared" && comparison.previous_scan) {
    return `${comparison.previous_scan.label} → ${comparison.current_scan.label}`;
  }
  if (comparison.status === "skipped_current_partial") {
    return "本次为 PARTIAL；为避免误报库存消失，已跳过变化计算。";
  }
  return "尚无可比较的历史完整扫描。";
}

function render(report) {
  const coveredStates = Object.keys(
    report.coverage.discovered_store_states || {},
  ).length;
  const complete = report.status === "COMPLETE";
  const comparison = report.comparison;
  const changes = report.changes || [];

  document.title = `Trek 美国本土价格扫描 · ${report.report_date}`;
  root.innerHTML = `
    <header class="report-header">
      <div>
        <p class="eyebrow">BIKE PRICE ALERTS · TREK</p>
        <h1>美国本土价格扫描</h1>
        <p class="muted mono">${escapeHtml(report.report_date)}</p>
      </div>
      <div class="status ${complete ? "complete" : "partial"}">
        <strong>${escapeHtml(report.status)}</strong>
        <small>${report.national_claim_allowed ? "全国最低口径有效" : "仅代表已覆盖范围"}</small>
      </div>
    </header>

    <section class="summary-grid" aria-label="扫描摘要">
      <article><span>覆盖州与 DC</span><strong>${coveredStates}/49</strong><small>缺失 ${number(report.coverage.missing_store_states.length)}</small></article>
      <article><span>Locally 可扫描门店</span><strong>${number(report.store_counts.locally_scannable_store_count)}</strong><small>Trek 官方 ${number(report.store_counts.official_conus_store_count)}</small></article>
      <article><span>有效报价组合</span><strong>${number(report.scan.listing_count)}</strong><small>按门店 × UPC 去重</small></article>
      <article><span>未定价库存组合</span><strong>${number(report.coverage.unpriced_stocked_store_variant_pairs)}</strong><small>错误 ${number(report.scan.error_count)}</small></article>
    </section>

    <section class="method-note">
      <strong>数据口径</strong>
      <p>有效报价组合指目标尺码、库存与价格均已验证的“门店 × UPC”组合。同一门店的不同颜色或 UPC 分别计数；门店数另行去重。</p>
    </section>

    <div class="model-stack">${report.models.map(modelSection).join("")}</div>

    <section class="panel changes">
      <div class="section-heading">
        <div>
          <h2>较上次完整 ${escapeHtml(comparison.profile)} 扫描的变化</h2>
          <p>${escapeHtml(comparisonCopy(comparison))}</p>
        </div>
        <strong>${comparison.status === "compared" ? `${number(changes.length)} 项` : "未比较"}</strong>
      </div>
      ${
        comparison.status === "compared" && changes.length
          ? `<div class="table-scroll">
              <table>
                <thead><tr><th>变化</th><th>车型</th><th>门店</th><th>地区</th><th>颜色 / 尺码</th><th>价格</th></tr></thead>
                <tbody>${changeRows(changes)}</tbody>
              </table>
            </div>`
          : `<p class="empty">${comparison.status === "compared" ? "未检测到报价变化。" : "完整扫描恢复后会自动继续 rolling comparison。"}</p>`
      }
    </section>

    <footer>
      <div><strong>扫描时间 ${escapeHtml(comparison.current_scan.label)}</strong><span>报告生成 ${escapeHtml(report.generated_at)}</span></div>
      <nav><a href="./latest-report.md" download>下载 Markdown</a><a href="./latest-report.json" download>下载 JSON</a></nav>
      <p>价格与库存会变化，购买前请向门店复核。</p>
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
    root.innerHTML = `
      <section class="load-error">
        <h1>报告暂时不可用</h1>
        <p>${escapeHtml(error.message)}</p>
      </section>`;
  });
