# gsm.bio's side of the demo page: the group comparison widget, saved as one
# file, and Analyze_GroupDifferenceBy() called as a reader would call it.
#   Rscript gsm-bio.R <gsm.bio checkout> <scratch dir> <gsm.bio commit>
# Writes <scratch dir>/widgets/widget-group-comparison.html and
# <scratch dir>/gsm-bio.json (the versions, the file's size, and the function's
# answer for D-dimer at each visit, unadjusted and adjusted by Holm).
args <- commandArgs(TRUE)
pkg <- args[1]; out <- args[2]
suppressMessages(devtools::load_all(pkg, quiet = TRUE))

lColumns <- list(
  list(value_col = "ARM", label = "Arm"),
  list(value_col = "SEX", label = "Sex"),
  list(value_col = "RESPONSE", label = "Response")
)
# The help page's example (change from Baseline, by arm), naming Holm so that
# the adjusted row of tests is stored beside the unadjusted one.
w <- Widget_GroupComparison(
  Synthetic_Results, Synthetic_Participants,
  lSettings = list(
    value_type = "change", baseline_visits = "Baseline", group_by = "ARM",
    groups = lColumns, filters = lColumns, visit_adjustment = "holm"
  )
)
file <- file.path(out, "widgets", "widget-group-comparison.html")
dir.create(dirname(file), showWarnings = FALSE, recursive = TRUE)
htmlwidgets::saveWidget(w, file, selfcontained = TRUE, title = "widget-group-comparison")

# A group test at every visit, in one call: D-dimer by arm.
d <- merge(Synthetic_Results[Synthetic_Results$TEST == "D-dimer", ], Synthetic_Participants[c("USUBJID", "ARM")])
chrVisits <- c("Baseline", "Week 2", "Week 4", "Week 8", "Week 12")
by <- function(adjust) Analyze_GroupDifferenceBy(d, "STRESN", "ARM", "VISIT", chrBy = chrVisits, strPAdjust = adjust)
jsonlite::write_json(list(
  r_version = R.version.string,
  gsm_bio = as.character(packageVersion("gsm.bio")),
  gsm_bio_commit = args[3],
  widget_bytes = file.info(file)$size,
  by_visit_formals = names(formals(Analyze_GroupDifferenceBy)),
  by_visit_none = by("none"),
  by_visit_holm = by("holm")
), file.path(out, "gsm-bio.json"), auto_unbox = TRUE, digits = NA, pretty = TRUE, dataframe = "rows", force = TRUE)
cat("done\n")
