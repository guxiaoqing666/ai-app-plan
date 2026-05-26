(function () {
  "use strict";

  const routes = Array.isArray(window.CITYWALK_ROUTES) ? window.CITYWALK_ROUTES : [];

  const labels = {
    city: ["不限城市", ...unique(routes.map((route) => route.city))],
    duration: ["不限时长", "半日", "一日", "夜晚"],
    budget: ["不限预算", "50-100", "100-200"],
    companion: ["不限同行", "一个人", "朋友", "情侣", "亲子"],
    interest: ["不限偏好", "拍照", "美食", "咖啡", "茶馆", "夜景", "老街", "江景", "自然", "亲子", "松弛", "展览", "书店", "音乐", "湖景"],
    intensity: ["不限强度", "轻松", "适中"]
  };

  const defaultFilters = {
    city: "不限城市",
    duration: "不限时长",
    budget: "不限预算",
    companion: "不限同行",
    interest: "不限偏好",
    intensity: "不限强度"
  };

  const state = {
    filters: { ...defaultFilters },
    selectedRouteId: routes[0] ? routes[0].id : null,
    deferredInstallPrompt: null
  };

  const els = {
    filters: document.querySelector("#routeFilters"),
    city: document.querySelector("#cityFilter"),
    duration: document.querySelector("#durationFilter"),
    budget: document.querySelector("#budgetFilter"),
    companion: document.querySelector("#companionFilter"),
    interest: document.querySelector("#interestFilter"),
    intensity: document.querySelector("#intensityFilter"),
    routeList: document.querySelector("#routeList"),
    routeDetail: document.querySelector("#routeDetail"),
    resultCount: document.querySelector("#resultCount"),
    emptyState: document.querySelector("#emptyState"),
    reset: document.querySelector("#resetButton"),
    emptyReset: document.querySelector("#emptyResetButton"),
    surprise: document.querySelector("#surpriseButton"),
    feedbackShortcut: document.querySelector("#feedbackShortcut"),
    feedback: document.querySelector("#feedback"),
    feedbackForm: document.querySelector("#feedbackForm"),
    feedbackNote: document.querySelector("#feedbackNote"),
    copyFeedback: document.querySelector("#copyFeedbackButton"),
    install: document.querySelector("#installButton"),
    toast: document.querySelector("#toast")
  };

  init();

  function init() {
    if (!routes.length) {
      showToast("路线数据还没有准备好");
      return;
    }

    populateSelects();
    bindEvents();
    registerServiceWorker();
    render();
    track("app_opened", {});
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function populateSelects() {
    fillSelect(els.city, labels.city);
    fillSelect(els.duration, labels.duration);
    fillSelect(els.budget, labels.budget);
    fillSelect(els.companion, labels.companion);
    fillSelect(els.interest, labels.interest);
    fillSelect(els.intensity, labels.intensity);
  }

  function fillSelect(select, values) {
    select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  }

  function bindEvents() {
    els.filters.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      state.filters[target.name] = target.value;
      const matched = getMatchedRoutes();
      state.selectedRouteId = matched[0] ? matched[0].id : null;
      render();
      track("filter_changed", { field: target.name, value: target.value });
    });

    els.reset.addEventListener("click", resetFilters);
    els.emptyReset.addEventListener("click", resetFilters);
    els.surprise.addEventListener("click", chooseSurpriseRoute);
    els.feedbackShortcut.addEventListener("click", () => els.feedback.scrollIntoView({ behavior: "smooth", block: "start" }));
    els.routeList.addEventListener("click", handleRouteListClick);
    els.routeDetail.addEventListener("click", handleDetailClick);
    els.feedbackForm.addEventListener("submit", handleFeedbackSubmit);
    els.copyFeedback.addEventListener("click", copyFeedbackTemplate);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      els.install.hidden = false;
    });

    els.install.addEventListener("click", async () => {
      if (!state.deferredInstallPrompt) {
        return;
      }
      state.deferredInstallPrompt.prompt();
      const result = await state.deferredInstallPrompt.userChoice;
      track("install_prompt", { outcome: result.outcome });
      state.deferredInstallPrompt = null;
      els.install.hidden = true;
    });
  }

  function render() {
    const matched = getMatchedRoutes();
    renderRouteList(matched);
    renderRouteDetail(getSelectedRoute(matched));
    els.emptyState.hidden = matched.length > 0;
    els.resultCount.textContent = `${matched.length} 条`;
  }

  function getMatchedRoutes() {
    return routes
      .map((route) => ({ route, score: scoreRoute(route) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.route.budgetMin - b.route.budgetMin)
      .map((item) => item.route);
  }

  function scoreRoute(route) {
    let score = 0;
    const { city, duration, budget, companion, interest, intensity } = state.filters;

    if (city !== defaultFilters.city) {
      if (route.city !== city) return -1;
      score += 8;
    }

    if (duration !== defaultFilters.duration) {
      if (route.duration !== duration) return -1;
      score += 4;
    }

    if (budget !== defaultFilters.budget) {
      if (route.budget !== budget) return -1;
      score += 4;
    }

    if (companion !== defaultFilters.companion) {
      if (!route.companions.includes(companion)) return -1;
      score += 3;
    }

    if (interest !== defaultFilters.interest) {
      if (!route.interests.includes(interest)) return -1;
      score += 3;
    }

    if (intensity !== defaultFilters.intensity) {
      if (route.intensity !== intensity) return -1;
      score += 2;
    }

    return score;
  }

  function renderRouteList(matched) {
    els.routeList.innerHTML = matched
      .map((route, index) => {
        const featuredClass = route.id === state.selectedRouteId || (!state.selectedRouteId && index === 0) ? " is-featured" : "";
        const tags = [route.city, route.duration, `${route.budgetMin}-${route.budgetMax}元`, route.intensity];
        return `
          <article class="route-card${featuredClass}">
            <div class="route-art" aria-hidden="true"></div>
            <div class="meta-row">
              <span class="match-badge">${index === 0 ? "最推荐" : "可选"}</span>
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <h3>${escapeHtml(route.title)}</h3>
            <p>${escapeHtml(route.tagline)}</p>
            <div class="tag-row">
              ${route.interests.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <div class="card-actions">
              <button class="pill-button primary" type="button" data-action="view" data-route-id="${route.id}">查看路线</button>
              <button class="pill-button" type="button" data-action="copy" data-route-id="${route.id}">复制文案</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function getSelectedRoute(matched) {
    const selected = routes.find((route) => route.id === state.selectedRouteId);
    return selected || matched[0] || null;
  }

  function renderRouteDetail(route) {
    if (!route) {
      els.routeDetail.innerHTML = "";
      return;
    }

    state.selectedRouteId = route.id;
    const routeText = buildRouteText(route);
    const xhsText = buildXhsText(route);

    els.routeDetail.innerHTML = `
      <div class="detail-shell">
        <div class="detail-hero">
          <div>
            <p class="eyebrow">${escapeHtml(route.city)} / ${escapeHtml(route.duration)}</p>
            <h2>${escapeHtml(route.title)}</h2>
            <p>${escapeHtml(route.bestFor)}</p>
          </div>
          <div class="route-stats" aria-label="路线概览">
            <div class="stat-box">
              <strong>${escapeHtml(route.duration)}</strong>
              <span>预计时长</span>
            </div>
            <div class="stat-box">
              <strong>${route.budgetMin}-${route.budgetMax}</strong>
              <span>人均预算</span>
            </div>
            <div class="stat-box">
              <strong>${escapeHtml(route.intensity)}</strong>
              <span>步行强度</span>
            </div>
          </div>
        </div>

        <div class="detail-actions">
          <button class="primary-button" type="button" data-detail-action="copy-route">复制完整路线</button>
          <button class="secondary-button" type="button" data-detail-action="copy-xhs">复制小红书文案</button>
          <button class="secondary-button" type="button" data-detail-action="share">系统分享</button>
        </div>

        <ol class="timeline">
          ${route.stops.map((stop) => `
            <li class="timeline-item">
              <div class="timeline-time">${escapeHtml(stop.time)}</div>
              <div>
                <h3>${escapeHtml(stop.name)}</h3>
                <p>${escapeHtml(stop.area)} · ${escapeHtml(stop.note)}</p>
                <div class="tag-row">
                  <span>${escapeHtml(stop.cost)}</span>
                  <span>${escapeHtml(stop.photoTip)}</span>
                </div>
              </div>
            </li>
          `).join("")}
        </ol>

        <div class="mini-grid">
          <div class="info-block">
            <h3>交通建议</h3>
            <p>${escapeHtml(route.transport)}</p>
          </div>
          <div class="info-block">
            <h3>雨天备选</h3>
            <p>${escapeHtml(route.rainPlan)}</p>
          </div>
          <div class="info-block">
            <h3>避坑提醒</h3>
            <p>${escapeHtml(route.avoid)}\n营业时间、价格和交通以地图及商家当天信息为准。</p>
          </div>
          <div class="copy-block">
            <h3>小红书文案</h3>
            <p>${escapeHtml(xhsText)}</p>
          </div>
        </div>
      </div>
    `;

    els.routeDetail.dataset.routeText = routeText;
    els.routeDetail.dataset.xhsText = xhsText;
  }

  function handleRouteListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const route = routes.find((item) => item.id === button.dataset.routeId);
    if (!route) {
      return;
    }

    if (button.dataset.action === "view") {
      state.selectedRouteId = route.id;
      render();
      els.routeDetail.scrollIntoView({ behavior: "smooth", block: "start" });
      track("route_viewed", { routeId: route.id, city: route.city });
    }

    if (button.dataset.action === "copy") {
      copyText(buildXhsText(route), "小红书文案已复制");
      track("xhs_copied", { routeId: route.id, city: route.city });
    }
  }

  function handleDetailClick(event) {
    const button = event.target.closest("button[data-detail-action]");
    if (!button) {
      return;
    }

    const route = routes.find((item) => item.id === state.selectedRouteId);
    if (!route) {
      return;
    }

    const action = button.dataset.detailAction;
    if (action === "copy-route") {
      copyText(els.routeDetail.dataset.routeText || buildRouteText(route), "完整路线已复制");
      track("route_copied", { routeId: route.id, city: route.city });
    }

    if (action === "copy-xhs") {
      copyText(els.routeDetail.dataset.xhsText || buildXhsText(route), "小红书文案已复制");
      track("xhs_copied", { routeId: route.id, city: route.city });
    }

    if (action === "share") {
      shareRoute(route);
    }
  }

  function resetFilters() {
    state.filters = { ...defaultFilters };
    Object.entries(state.filters).forEach(([key, value]) => {
      if (els[key]) {
        els[key].value = value;
      }
    });
    state.selectedRouteId = routes[0].id;
    render();
    track("filters_reset", {});
  }

  function chooseSurpriseRoute() {
    const matched = getMatchedRoutes();
    const pool = matched.length ? matched : routes;
    const next = pool[Math.floor(Math.random() * pool.length)];
    state.selectedRouteId = next.id;
    render();
    els.routeDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    track("surprise_route", { routeId: next.id, city: next.city });
  }

  function handleFeedbackSubmit(event) {
    event.preventDefault();
    const formData = new FormData(els.feedbackForm);
    const payload = {
      contact: String(formData.get("contact") || "").trim(),
      need: String(formData.get("need") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      routeId: state.selectedRouteId,
      createdAt: new Date().toISOString()
    };

    if (!payload.contact && !payload.message) {
      showToast("先写一点联系方式或反馈");
      return;
    }

    const saved = JSON.parse(localStorage.getItem("zouzou_feedback") || "[]");
    saved.push(payload);
    localStorage.setItem("zouzou_feedback", JSON.stringify(saved));
    els.feedbackForm.reset();
    els.feedbackNote.textContent = `已保存在当前浏览器，共 ${saved.length} 条。上线后可把这里替换成飞书/腾讯文档表单。`;
    showToast("反馈已保存");
    track("feedback_saved", { need: payload.need, hasContact: Boolean(payload.contact) });
  }

  function copyFeedbackTemplate() {
    const route = routes.find((item) => item.id === state.selectedRouteId);
    const template = [
      "走走AI反馈",
      `当前路线：${route ? route.city + " - " + route.title : "未选择"}`,
      "联系方式：",
      "最想要的功能：",
      "愿意付费的功能/价格：",
      "一句建议："
    ].join("\n");
    copyText(template, "反馈模板已复制");
  }

  function buildRouteText(route) {
    const lines = [
      `${route.city}｜${route.title}`,
      route.tagline,
      `适合：${route.bestFor}`,
      `预算：${route.budgetMin}-${route.budgetMax}元 / 强度：${route.intensity}`,
      "",
      "路线：",
      ...route.stops.map((stop) => `${stop.time} ${stop.name}：${stop.note}（${stop.cost}）`),
      "",
      `交通：${route.transport}`,
      `雨天：${route.rainPlan}`,
      `提醒：${route.avoid}`,
      "营业时间、价格和交通以地图及商家当天信息为准。"
    ];
    return lines.join("\n");
  }

  function buildXhsText(route) {
    return [
      route.xhs.title,
      "",
      route.xhs.body,
      "",
      route.xhs.tags.map((tag) => `#${tag}`).join(" ")
    ].join("\n");
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      showToast(successMessage);
    } catch (error) {
      showToast("复制失败，请手动选择文本");
    }
  }

  async function shareRoute(route) {
    const text = buildRouteText(route);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `走走AI｜${route.city}路线`,
          text
        });
        track("route_shared", { routeId: route.id, city: route.city });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
      }
    }

    copyText(text, "当前浏览器不支持系统分享，路线已复制");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2600);
  }

  function track(eventName, data) {
    const event = {
      eventName,
      data,
      path: window.location.pathname,
      createdAt: new Date().toISOString()
    };
    const events = JSON.parse(localStorage.getItem("zouzou_events") || "[]");
    events.push(event);
    localStorage.setItem("zouzou_events", JSON.stringify(events.slice(-200)));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        showToast("离线缓存注册失败，不影响使用");
      });
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.zouzouDebug = {
    exportEvents() {
      return JSON.parse(localStorage.getItem("zouzou_events") || "[]");
    },
    exportFeedback() {
      return JSON.parse(localStorage.getItem("zouzou_feedback") || "[]");
    }
  };
})();
