/**
 * Restore classic DOM order when the redesign experiment is active:
 *
 * Experiment:
 *   #below → [metadata] + [#related, #comments(hidden)]
 *   #secondary → engagement panels (visible Comments)
 *
 * Classic:
 *   #below → [metadata] + [#comments]
 *   #secondary-inner → #related
 */
(() => {
  const WATCH = () => location.pathname === "/watch";
  let timer = 0;
  let last = 0;

  function needsRestore() {
    if (!WATCH()) return false;
    const flexy = document.querySelector("ytd-watch-flexy");
    const below = document.querySelector("#below");
    const secondary = document.querySelector("#secondary-inner");
    if (!flexy || !below || !secondary) return false;

    const relatedUnderBelow = !!below.querySelector(":scope #related, #related");
    const relatedInSecondary = !!secondary.querySelector("#related");
    const commentsPanelOpen =
      flexy.hasAttribute("is-comments-panel-visible") ||
      flexy.hasAttribute("panel-expanded") ||
      flexy.hasAttribute("fixed-panel-expanded");
    const commentsHidden =
      (() => {
        const c = document.querySelector("#below #comments, ytd-comments#comments");
        return c && getComputedStyle(c).display === "none";
      })();

    return (
      (relatedUnderBelow && !relatedInSecondary) ||
      commentsPanelOpen ||
      commentsHidden ||
      flexy.hasAttribute("side-rail-dismissible-panels") ||
      flexy.hasAttribute("fixed-default-panels")
    );
  }

  function moveRelatedToSidebar() {
    const below = document.querySelector("#below");
    const secondary = document.querySelector("#secondary-inner");
    if (!below || !secondary) return;

    const related = below.querySelector("#related");
    if (!related) return;

    // Prefer appending after panels/chat so ads/playlist stay usable
    const donation = secondary.querySelector("#donation-shelf");
    if (donation) secondary.insertBefore(related, donation.nextSibling);
    else secondary.appendChild(related);
  }

  function ensureCommentsVisibleUnderBelow() {
    const below = document.querySelector("#below");
    if (!below) return;
    let comments =
      below.querySelector("ytd-comments#comments") ||
      below.querySelector("#comments") ||
      document.querySelector("ytd-comments#comments");

    // If comments only exist inside an engagement panel, leave a visible #comments under below
    if (comments && !below.contains(comments)) {
      below.appendChild(comments);
    }

    comments =
      below.querySelector("ytd-comments#comments") ||
      below.querySelector("#comments");
    if (comments) {
      comments.style.setProperty("display", "block", "important");
      comments.removeAttribute("hidden");
    }
  }

  function stripAttrs() {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (!flexy) return;
    [
      "fixed-default-panels",
      "side-rail-dismissible-panels",
      "dismissible-panels-expanded-wn",
      "fixed-panel-expanded",
      "using-fixed-panel",
      "show-fixed-side-menu",
      "engagement-panel-expanded",
      "panel-expanded",
      "is-comments-panel-visible",
    ].forEach((a) => flexy.removeAttribute(a));
  }

  function hideSideRailChrome() {
    // Collapse the thin icon rail / open comments panel chrome
    document
      .querySelectorAll(
        "#panels ytd-engagement-panel-section-list-renderer[visibility='ENGAGEMENT_PANEL_VISIBILITY_EXPANDED'], #panels ytd-engagement-panel-section-list-renderer[target-id*='comment' i], #panels ytd-engagement-panel-section-list-renderer[target-id*='comments' i]"
      )
      .forEach((p) => {
        p.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN");
      });

    // Heuristic: any expanded panel that contains a comments header
    document.querySelectorAll("#panels ytd-engagement-panel-section-list-renderer").forEach((p) => {
      const title = (p.textContent || "").slice(0, 80);
      if (/^\s*Comments/i.test(title) || p.querySelector("#comment-teaser, ytd-comments")) {
        // only hide if it's the big comments panel (has many comments or teaser)
        if (p.querySelector("ytd-comment-thread-renderer, #contents")) {
          p.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN");
        }
      }
    });
  }

  function restore() {
    if (!WATCH()) return;
    stripAttrs();
    moveRelatedToSidebar();
    ensureCommentsVisibleUnderBelow();
    hideSideRailChrome();
    document.documentElement.setAttribute("data-ycl-classic", "1");
    document.documentElement.setAttribute("data-ycl-restored", "1");
    last = Date.now();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (needsRestore() || WATCH()) restore();
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("yt-page-data-updated", schedule);

  const mo = new MutationObserver(() => {
    if (Date.now() - last < 150) return;
    if (WATCH()) schedule();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
})();
