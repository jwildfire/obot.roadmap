# Desktop R: the numbers the demo page prints, recomputed with gsm.bio at 8720f73,
# and the four widgets saved as self-contained pages.
args <- commandArgs(TRUE); out <- args[1]
.libPaths(c(args[2], .libPaths()))
library(gsm.bio)
num <- function(x) suppressWarnings(as.numeric(x))
res <- Synthetic_Results
wide <- function(visit, value = c("raw","change")) {
  value <- match.arg(value)
  f <- Synthetic_Participants
  for (b in unique(res$TEST)) {
    one <- res[res$TEST == b, ]
    v <- one[one$VISIT == visit, ]; bl <- one[one$VISIT == "Baseline", ]
    x <- num(v$STRESN[match(f$USUBJID, v$USUBJID)])
    if (value == "change") x <- x - num(bl$STRESN[match(f$USUBJID, bl$USUBJID)])
    f[[b]] <- x
  }
  f
}
out_list <- list(r_version = R.version.string, gsm_bio = as.character(packageVersion("gsm.bio")))
# Group comparison: IL-6 change from Baseline, by arm, each visit after Baseline
gc <- list()
for (v in c("Week 2","Week 4","Week 8","Week 12")) {
  f <- wide(v, "change")
  r <- Analyze_GroupDifference(f, "IL-6", "ARM", chrGroups = c("Placebo","Treatment"))
  gc[[v]] <- list(method = r$method, p_value = r$p_value, counts = r$counts, estimates = r$estimates)
}
out_list$group_comparison_il6_change <- gc
# Association: TNF-alpha vs IL-10 at Baseline
f0 <- wide("Baseline")
cr <- Analyze_Correlation(f0, "TNF-alpha", "IL-10", strGroupCol = "ARM")
fit <- Analyze_Fit(f0, "TNF-alpha", "IL-10")
out_list$correlation <- cr[setdiff(names(cr), "rows")]
out_list$fit <- fit[setdiff(names(fit), c("rows","line","band"))]
# Matrix: 12 biomarkers at Baseline
bm <- sort(unique(res$TEST))
mx <- Analyze_CorrelationMatrix(f0, bm)
out_list$matrix <- mx
# Screen: change at Week 4, Placebo vs Treatment
f4 <- wide("Week 4", "change")
sc <- Analyze_Screen(f4, bm, strGroupCol = "ARM", chrGroups = c("Placebo","Treatment"))
out_list$screen <- sc
out_list$synthetic_truth <- Synthetic_Truth
out_list$synthetic_sizes <- list(participants = nrow(Synthetic_Participants), results = nrow(Synthetic_Results), biomarkers = length(unique(res$TEST)), visits = length(unique(res$VISIT)))
jsonlite::write_json(out_list, file.path(out, "desktop-r.json"), auto_unbox = TRUE, digits = NA, pretty = TRUE, force = TRUE)

# The four widgets, as their help pages' examples make them
cols <- list(list(value_col = "ARM", label = "Arm"), list(value_col = "SEX", label = "Sex"), list(value_col = "RESPONSE", label = "Response"))
save <- function(w, name) htmlwidgets::saveWidget(w, file.path(out, paste0(name, ".html")), selfcontained = TRUE, title = name)
save(Widget_GroupComparison(Synthetic_Results, Synthetic_Participants, lSettings = list(start_value = "IL-6", value_type = "change", baseline_visits = "Baseline", group_by = "ARM", groups = cols, filters = cols)), "group-comparison")
save(Widget_AssociationScatter(Synthetic_Results, Synthetic_Participants, lSettings = list(x = list(measure = "TNF-alpha", visit = "Baseline"), y = list(measure = "IL-10", visit = "Baseline"), baseline_visits = "Baseline", color_by = "ARM", fit = "linear", groups = cols, filters = cols)), "association-scatter")
save(Widget_CorrelationMatrix(Synthetic_Results, Synthetic_Participants, lSettings = list(visit = "Baseline", baseline_visits = "Baseline", filters = cols, scatter = list(groups = cols))), "correlation-matrix")
save(Widget_BiomarkerScreen(Synthetic_Results, Synthetic_Participants, lSettings = list(visit = "Week 4", value_type = "change", group_by = "ARM", baseline_visits = "Baseline", groups = cols, filters = cols, group_comparison = list(groups = cols))), "biomarker-screen")
cat("done\n")
