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

# Publishes site/status-unavailable.html in place of the dashboard, so the frame in
# status.html always has something honest to show. The workflow does the same when
# this script never gets to run at all.
placeholder <- function(reason) {
  file.copy(
    file.path(root, "site", "status-unavailable.html"),
    file.path(out_dir, "index.html"),
    overwrite = TRUE
  )
  cat(sprintf("::warning title=Package status dashboard::%s\n", substr(reason, 1, 200)))
  cat("status: placeholder published\n")
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
