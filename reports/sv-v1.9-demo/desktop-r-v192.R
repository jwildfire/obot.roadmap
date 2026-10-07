# Desktop R, base R alone: the numbers the v1.9.2 note prints from the demo
# app's Biomarkers tab, recomputed from the app's own pilot study files
# (safety.viz site/data). It sources nothing from gsm.bio.
#   Rscript desktop-r-v192.R <safety.viz checkout> <out.json>
args <- commandArgs(TRUE); root <- args[1]
bds <- read.csv(file.path(root, "site/data/adbds.csv"), stringsAsFactors = FALSE)
sl <- read.csv(file.path(root, "site/data/adsl.csv"), stringsAsFactors = FALSE)
out <- list(r = R.version.string, participants = length(unique(sl$USUBJID)), biomarkers = length(unique(bds$TEST)))

# One biomarker over time: Alanine Aminotransferase by arm at each scheduled
# visit, the arm taken from the subject-level file, a participant's first
# result at the visit, one-way analysis of variance with equal variances.
alt <- bds[bds$TEST == "Alanine Aminotransferase", ]
alt$ARM <- sl$ARM[match(alt$USUBJID, sl$USUBJID)]
alt$y <- suppressWarnings(as.numeric(alt$STRESN))
visits <- c("Baseline", paste("Week", c(2, 4, 6, 8, 12, 16, 20, 24, 26)))
out$unscheduled_visits <- length(grep("^Unscheduled", unique(bds$VISIT)))
out$alt_by_visit <- lapply(setNames(visits, visits), function(v) {
  d <- alt[alt$VISIT == v & !is.na(alt$y) & !is.na(alt$ARM), ]
  d <- d[!duplicated(d$USUBJID), ]
  p <- anova(lm(y ~ factor(ARM), data = d))[["Pr(>F)"]][1]
  list(p_value = p, printed = sprintf("p = %.3f", p), counts = as.list(table(d$ARM)))
})

# The cross-tabulation: arm by end-of-study status, with R's two tests.
tab <- table(sl$ARM, sl$EOSSTT)
chi <- chisq.test(tab); fis <- fisher.test(tab)
out$cross_tab <- list(
  counts = lapply(setNames(rownames(tab), rownames(tab)), function(r) as.list(tab[r, ])),
  total = sum(tab),
  chi_square = list(method = chi$method, p_value = chi$p.value),
  fisher = list(method = fis$method, p_value = fis$p.value)
)
jsonlite::write_json(out, args[2], auto_unbox = TRUE, digits = NA, pretty = TRUE, null = "null")
for (v in visits) cat(sprintf("%-9s %s  %s\n", v, out$alt_by_visit[[v]]$printed, paste(names(out$alt_by_visit[[v]]$counts), unlist(out$alt_by_visit[[v]]$counts), collapse = ", ")))
print(tab); cat(chi$method, format(chi$p.value, digits = 4), "\n", fis$method, format(fis$p.value, digits = 4), "\n")
cat("unscheduled visits:", out$unscheduled_visits, " biomarkers:", out$biomarkers, " participants:", out$participants, "\n")
