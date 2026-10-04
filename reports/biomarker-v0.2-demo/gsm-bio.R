# gsm.bio's side of the demo page: the two new widgets, saved as single files,
# and a batch run of the two specifications the live bio.viz charts wrote
# (capture.mjs section 4), each across every biomarker.
#   Rscript gsm-bio.R <gsm.bio checkout> <scratch dir>
# Writes into <scratch dir>: widget-survival.html, widget-crosstab.html, the
# batch folder batch/ (figures, RTF tables, manifest.json), batch-listing.txt
# and gsm-bio.json (what was written, and the versions).
args <- commandArgs(TRUE)
pkg <- args[1]; out <- args[2]
suppressMessages(devtools::load_all(pkg, quiet = TRUE))

save <- function(w, name) {
  htmlwidgets::saveWidget(w, file.path(out, paste0(name, ".html")), selfcontained = TRUE, title = name)
}
# The two new widgets, as their help pages' first examples make them, plus the
# demo pages' titles.
save(Widget_StratifiedSurvival(
  Synthetic_Results, Synthetic_Participants,
  lSettings = list(
    endpoint = "EFS",
    group_by = list(measure = "CRP", visit = "Baseline", cut = "median"),
    cuts = list(list(measure = "CRP", visit = "Baseline", cut = "tertiles")),
    title = "{endpoint} by {group}", subtitle = "{n} participants"
  ),
  dfOutcomes = Synthetic_Outcomes
), "widget-survival")
save(Widget_CrossTab(
  Synthetic_Results, Synthetic_Participants,
  lSettings = list(
    row_by = "RESPONSE",
    col_by = list(measure = "CRP", visit = "Baseline", cut = "median"),
    title = "{rows} by {columns}", subtitle = "{n} participants"
  )
), "widget-crosstab")

# The batch run: the specifications exactly as the browser wrote them.
specs <- c(file.path(out, "spec-survival.json"), file.path(out, "spec-crosstab.json"))
both <- paste0("[", paste(vapply(specs, function(f) paste(readLines(f, warn = FALSE), collapse = "\n"), ""), collapse = ",\n"), "]")
folder <- file.path(out, "batch")
t0 <- Sys.time()
manifest <- Run_Specifications(both, Synthetic_Results, Synthetic_Participants, Synthetic_Outcomes,
  strFolder = folder, bAcrossBiomarkers = TRUE)
seconds <- as.numeric(difftime(Sys.time(), t0, units = "secs"))
files <- sort(list.files(folder))
info <- file.info(file.path(folder, files))
writeLines(sprintf("%9s  %s", format(info$size, big.mark = ","), files), file.path(out, "batch-listing.txt"))

jsonlite::write_json(list(
  r_version = R.version.string,
  gsm_bio = as.character(packageVersion("gsm.bio")),
  gsm_bio_commit = system2("git", c("-C", pkg, "rev-parse", "HEAD"), stdout = TRUE),
  batch_seconds = seconds,
  batch_files = length(files),
  batch_bytes = sum(info$size),
  manifest = manifest
), file.path(out, "gsm-bio.json"), auto_unbox = TRUE, digits = NA, pretty = TRUE, dataframe = "rows")
cat("done\n")
