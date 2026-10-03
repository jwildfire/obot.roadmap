# Desktop R: the ANOVA the demo app's group comparison prints for Alanine
# Aminotransferase by arm at each visit, recomputed from the app's own pilot
# study files (safety.viz site/data at 3acaf62) with the gsm.bio statistics
# file the app vendors (site/vendor/gsm.bio/statistics.R).
#   Rscript desktop-r-sv19.R <safety.viz checkout> <out.json>
args <- commandArgs(TRUE); root <- args[1]
source(file.path(root, "site/vendor/gsm.bio/statistics.R"), local = globalenv())
bds <- read.csv(file.path(root, "site/data/adbds.csv"), stringsAsFactors = FALSE)
sl <- read.csv(file.path(root, "site/data/adsl.csv"), stringsAsFactors = FALSE)
alt <- bds[bds$TEST == "Alanine Aminotransferase", ]
alt$ARM <- sl$ARM[match(alt$USUBJID, sl$USUBJID)]
alt$y <- suppressWarnings(as.numeric(alt$STRESN))
visits <- unique(alt[order(alt$VISITNUM), "VISIT"])
out <- list(r = R.version.string, participants = length(unique(sl$USUBJID)), visits = length(visits), duplicates = sum(duplicated(alt[, c("USUBJID", "VISIT")])))
res <- list()
for (v in visits) {
  d <- alt[alt$VISIT == v & !is.na(alt$y) & !is.na(alt$ARM), ]
  d <- d[!duplicated(d$USUBJID), c("USUBJID", "y", "ARM")]
  names(d)[3] <- "x"
  if (length(unique(d$x)) < 2) { res[[v]] <- list(rows = nrow(d), note = "fewer than two groups"); next }
  r <- Analyze_GroupDifference(d, "y", "x", strMethod = "anova", bPairwise = FALSE)
  res[[v]] <- list(rows = nrow(d), status = r$status, reason = r$reason, method = r$method, p_value = r$p_value, counts = r$counts)
}
out$alt_by_visit <- res
jsonlite::write_json(out, args[2], auto_unbox = TRUE, digits = NA, pretty = TRUE, null = "null")
for (v in names(res)) cat(sprintf("%-18s rows=%3d p=%s %s\n", v, res[[v]]$rows, format(res[[v]]$p_value, digits = 3), paste(names(res[[v]]$counts), unlist(res[[v]]$counts), collapse = ", ")))

# The biomarker screen the app opens on: every biomarker's result at Baseline,
# Placebo against Xanomeline High Dose, by Analyze_Screen. A participant's
# later result for the same biomarker and visit is not used, as the chart says.
base <- bds[bds$VISIT == "Baseline", ]
base$y <- suppressWarnings(as.numeric(base$STRESN))
base <- base[!duplicated(base[, c("USUBJID", "TEST")]), ]
frame <- data.frame(USUBJID = sl$USUBJID, ARM = sl$ARM, stringsAsFactors = FALSE)
tests <- sort(unique(bds$TEST))
for (t in tests) { one <- base[base$TEST == t, ]; frame[[t]] <- one$y[match(frame$USUBJID, one$USUBJID)] }
sc <- Analyze_Screen(frame, tests, strGroupCol = "ARM", chrGroups = c("Placebo", "Xanomeline High Dose"))
rows <- sc$rows[order(-sc$rows$estimate), ]
out$screen_baseline <- list(biomarkers = length(tests), duplicates_all = sum(duplicated(bds[, c("USUBJID", "TEST", "VISIT")])), top3 = rows[1:3, c("biomarker", "estimate", "lower", "upper", "p_unadjusted", "p_value", "n_1", "n_2")])
jsonlite::write_json(out, args[2], auto_unbox = TRUE, digits = NA, pretty = TRUE, null = "null")
print(rows[1:3, c("biomarker", "estimate", "lower", "upper", "p_unadjusted", "p_value", "n_1", "n_2")]); cat("duplicates across all:", out$screen_baseline$duplicates_all, " biomarkers:", length(tests), "\n")
