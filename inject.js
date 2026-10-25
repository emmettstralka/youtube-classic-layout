/**
 * Page-world script (document_start).
 * Disables YouTube experiment flags that put comments in a side panel,
 * move related videos under the player, and disable theater mode.
 * Target layout: related in #secondary, comments under #below, full-bleed theater.
 */
(function () {
  "use strict";

  const CLASSIC_FLAGS = {
    // Theater must work
    disable_theater_mode: false,

    // Fixed comments panel / dismissible side rail
    web_watch_fixed_default_panels: false,
    web_side_rail_dismissible_panels: false,
    web_dismissible_panels_expanded_wn: false,
    web_dismissible_panels_theater_state_fix: false,
    web_fixed_panel_watch_next_grid_swap: false,
    web_live_chat_panel_watch_next_grid_swap: false,
    web_watch_eligible_to_switch_to_grid: false,
    web_watch_enable_single_column_grid_view: false,
    web_watch_compact_comments: false,
    web_watch_compact_comments_header: false,
    web_comment_panel_easy_expand: false,
    optimal_reading_width_comments_ep: false,
    kevlar_watch_hide_comments_while_panel_open: false,
    kevlar_watch_focus_on_engagement_panels: false,
    kevlar_watch_flexy_comments_manager: false,
    web_watch_theater_chat: false,
    web_watch_theater_fixed_chat: false,
    web_watch_playlist_after_panels: false,
    enable_desktop_amsterdam_info_panels: false,
    desktop_enable_scrollable_suggestions_panel: false,

    // Older watch-grid experiment (still kill if present)
    kevlar_watch_grid: false,
    kevlar_watch_max_player_width: 1280,
    kevlar_watch_flexy_metadata_height: 136,
    kevlar_watch_comments_ep_disable_theater: false,
    kevlar_watch_comments_panel_button: false,
    small_avatars_for_comments: false,
    small_avatars_for_comments_ep: false,
    wn_grid_max_item_width: 0,
    wn_grid_min_item_width: 0,
    enable_main_app_watch_redux: false,
  };

  const STRIP_ATTRS = [
    "fixed-default-panels",
    "side-rail-dismissible-panels",
    "dismissible-panels-expanded-wn",
    "fixed-panel-expanded",
    "using-fixed-panel",
    "show-fixed-side-menu",
    "engagement-panel-expanded",
    "panel-expanded",
    "is-comments-panel-visible",
  ];

  function mergeFlags(target) {
    if (!target || typeof target !== "object") return;
    Object.assign(target, CLASSIC_FLAGS);
  }

  function applyFlags() {
    try {
      if (typeof ytcfg !== "undefined" && ytcfg) {
        const flags = ytcfg.get && ytcfg.get("EXPERIMENT_FLAGS");
        if (flags) {
          mergeFlags(flags);
          if (ytcfg.set) ytcfg.set("EXPERIMENT_FLAGS", flags);
        }
        if (ytcfg.data_ && ytcfg.data_.EXPERIMENT_FLAGS) {
          mergeFlags(ytcfg.data_.EXPERIMENT_FLAGS);
        }
      }
    } catch (_) {}
    try {
      if (window.yt && yt.config_ && yt.config_.EXPERIMENT_FLAGS) {
        mergeFlags(yt.config_.EXPERIMENT_FLAGS);
      }
    } catch (_) {}
  }

  function stripPanelAttrs() {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (!flexy) return;
    for (const a of STRIP_ATTRS) {
      if (flexy.hasAttribute(a)) flexy.removeAttribute(a);
    }
  }

  function closeCommentsPanel() {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (!flexy) return;

    // Prefer YouTube's own panel API when present
    try {
      if (typeof flexy.hideEngagementPanel === "function") {
        flexy.hideEngagementPanel("engagement-panel-comments");
      }
    } catch (_) {}

    try {
      const panels = document.querySelectorAll(
        "#panels ytd-engagement-panel-section-list-renderer, #secondary ytd-engagement-panel-section-list-renderer"
      );
      panels.forEach((p) => {
        const vis =
          p.getAttribute("visibility") ||
          p.getAttribute("target-id") ||
          p.getAttribute("panel-target-id") ||
          "";
        const isComments =
          /comment/i.test(vis) ||
          p.hasAttribute("watch-comments-panel") ||
          !!p.querySelector("ytd-comments, #comments");
        if (isComments) {
          p.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN");
          p.removeAttribute("expanded");
          try {
            if (p.hide) p.hide();
          } catch (_) {}
        }
      });
    } catch (_) {}

    // Click the panel close / comments rail toggle if visible
    const closeBtn =
      document.querySelector(
        '#panels ytd-engagement-panel-title-header-renderer button[aria-label*="Close"], #panels #visibility-button button, ytd-engagement-panel-title-header-renderer #close-button button'
      ) ||
      document.querySelector(
        'ytd-watch-flexy[is-comments-panel-visible] #chat-container ~ * button'
      );
    // Don't auto-click aggressively every tick — strip attrs is enough for CSS
  }

  function syncTheaterPlayerSize() {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (!flexy || !flexy.hasAttribute("theater") || flexy.hasAttribute("fullscreen")) return;
    const masthead = 56;
    const w = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const h = Math.min((w * 9) / 16, Math.max(240, window.innerHeight - masthead));
    const player = document.querySelector("#movie_player");
    try {
      if (player && typeof player.setSize === "function") player.setSize(w, h);
    } catch (_) {}
    try {
      if (player && typeof player.setInternalSize === "function") player.setInternalSize(w, h);
    } catch (_) {}
  }

  function applyAll() {
    applyFlags();
    stripPanelAttrs();
    closeCommentsPanel();
    document.documentElement.setAttribute("data-ycl-classic", "1");
    syncTheaterPlayerSize();
  }

  applyAll();
  const iv = setInterval(applyAll, 200);
  window.addEventListener("yt-navigate-start", applyAll);
  window.addEventListener("yt-navigate-finish", applyAll);
  window.addEventListener("yt-page-data-updated", applyAll);
  window.addEventListener("yt-page-type-changed", applyAll);
  window.addEventListener("resize", syncTheaterPlayerSize);

  const mo = new MutationObserver(() => {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (!flexy) return;
    if (STRIP_ATTRS.some((a) => flexy.hasAttribute(a))) stripPanelAttrs();
    if (flexy.hasAttribute("theater")) syncTheaterPlayerSize();
  });

  function watchFlexy() {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (flexy) {
      mo.observe(flexy, {
        attributes: true,
        attributeFilter: STRIP_ATTRS.concat(["theater", "fullscreen"]),
      });
    }
  }
  watchFlexy();
  document.addEventListener("DOMContentLoaded", watchFlexy, { once: true });
  window.addEventListener("yt-navigate-finish", () => setTimeout(watchFlexy, 100));

  window.addEventListener("load", () => {
    applyAll();
    setTimeout(() => clearInterval(iv), 8000);
  });
  setTimeout(() => clearInterval(iv), 25000);
})();
