#!/usr/bin/env Rscript
# Generate _site/status/index.html — the package status dashboard embedded by
# site/status.html, rendered with Gilead-BioStats/gh.dash from the repo list in
# scripts/status-repos.csv.
#
# Called from deploy-site.yml, so the dashboard is rebuilt on every site deploy
# (including the daily cron) and nothing generated is committed. gh.dash reads the
# GitHub REST API with GITHUB_PAT; in Actions that is the workflow token, which
# covers the public repos on the list.
#
# A render failure writes a placeholder page and emits a workflow warning rather
# than failing the deploy: an API hiccup on one dashboard should not block
# publishing the diary, roadmap, and news pages.

suppressWarnings(suppressMessages({
  ok <- requireNamespace("gh.dash", quietly = TRUE) && requireNamespace("rmarkdown", quietly = TRUE)
}))

file_arg <- grep("^--file=", commandArgs(FALSE), value = TRUE)
root <- if (length(file_arg)) {
  normalizePath(file.path(dirname(sub("^--file=", "", file_arg[1])), ".."))
} else {
  normalizePath(getwd())
}
out_dir <- file.path(root, "_site", "status")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

repos <- local({
  csv <- file.path(root, "scripts", "status-repos.csv")
  if (!file.exists(csv)) stop("scripts/status-repos.csv not found")
  x <- trimws(as.character(read.csv(csv, stringsAsFactors = FALSE)$repo))
  x[nzchar(x)]
})

token <- Sys.getenv("GITHUB_PAT", unset = Sys.getenv("GITHUB_TOKEN", unset = ""))

# Written when gh.dash cannot render, so /status.html always has something honest
# to embed. Deliberately plain: it inherits nothing from the site stylesheet.
placeholder <- function(reason) {
  html <- sprintf(
    '<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Package status — unavailable</title>
<style>
 body { margin: 0; padding: 2rem 1.5rem; background: #faf6f1; color: #2a211b;
        font: 16px/1.6 system-ui, -apple-system, sans-serif; }
 h1 { font: 400 1.4rem/1.2 Georgia, serif; margin: 0 0 .75rem; }
 p { margin: 0 0 .75rem; max-width: 42rem; }
 code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .86em;
        background: #f5efe7; border: 1px solid #ece2d7; border-radius: 6px; padding: .1em .35em; }
 .meta { color: #6b5d52; font-size: .9rem; }
</style></head><body>
<h1>Package status is temporarily unavailable</h1>
<p>The dashboard could not be rebuilt on this deploy, so nothing current is shown here.
Everything else on the site published normally.</p>
<p class="meta">Attempted %s · reason: <code>%s</code> ·
rebuilt by <code>scripts/build_status.R</code> on every run of
<a href="https://github.com/jwildfire/obot.roadmap/actions/workflows/deploy-site.yml">deploy-site.yml</a>.</p>
</body></html>',
    format(Sys.time(), "%Y-%m-%d %H:%M %Z", tz = "America/New_York"),
    gsub("[<>&]", " ", substr(reason, 1, 300))
  )
  writeLines(html, file.path(out_dir, "index.html"))
  cat(sprintf("::warning title=Package status dashboard::%s\n", substr(reason, 1, 200)))
  cat("status: placeholder written\n")
}

if (!ok) {
  placeholder("gh.dash and/or rmarkdown are not installed")
  quit(save = "no", status = 0)
}

template <- system.file("report", "package_status_report.Rmd", package = "gh.dash")
if (!nzchar(template)) {
  placeholder("gh.dash report template not found")
  quit(save = "no", status = 0)
}

# rmarkdown::render() rather than gh.dash::render_dash(): render_dash() does not
# expose the `repo` param, which sets the byline link under the report title.
result <- try(
  rmarkdown::render(
    input = template,
    output_dir = out_dir,
    output_file = "index.html",
    intermediates_dir = tempdir(),
    knit_root_dir = tempdir(),
    quiet = TRUE,
    params = list(
      token = token,
      title = "obot",
      repo = "jwildfire/obot.roadmap",
      packageList = repos,
      qualification_registry_url = NULL,
      pr_activity_days = 90,
      tabs = c("repo-status", "pr-activity")
    )
  ),
  silent = TRUE
)

if (inherits(result, "try-error")) {
  placeholder(conditionMessage(attr(result, "condition")))
} else {
  cat(sprintf("status: %d repos rendered to _site/status/index.html\n", length(repos)))
}
