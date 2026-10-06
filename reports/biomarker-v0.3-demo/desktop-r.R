# Desktop R: every number the demo page prints that R computed, recomputed
# straight from the synthetic study's CSV files with base R only. No gsm.bio
# function is called. jsonlite only writes the answers out.
#   Rscript desktop-r.R <folder of the CSVs> <desktop-r.json>
args <- commandArgs(TRUE)
dir <- args[1]
res <- read.csv(file.path(dir, "synthetic_results.csv"), stringsAsFactors = FALSE)
par <- read.csv(file.path(dir, "synthetic_participants.csv"), stringsAsFactors = FALSE)
visits <- unique(res[order(res$VISITNUM), "VISIT"])
o <- list(r_version = R.version.string,
  files_sha256 = vapply(c("synthetic_results.csv", "synthetic_participants.csv"),
    function(f) sub(" .*", "", system2("shasum", c("-a", "256", shQuote(file.path(dir, f))), stdout = TRUE)), ""),
  sizes = list(participants = nrow(par), results = nrow(res), biomarkers = length(unique(res$TEST)),
    visits = length(visits), duplicate_result_rows = sum(duplicated(res[c("USUBJID", "VISIT", "TEST")]))),
  visits = visits,
  # A visit is unscheduled, by the default rule, when its name holds either phrase.
  unscheduled_by_default = visits[grepl("unscheduled|early termination", visits, ignore.case = TRUE)])
res$ARM <- par$ARM[match(res$USUBJID, par$USUBJID)]

# One biomarker at each visit: the number in each arm with a value, Welch's
# t-test of the arms (t.test()'s default), and the p-values adjusted across the
# visits tested by p.adjust(). `change` takes each participant's Baseline off.
by_visit <- function(test, change = FALSE, at = visits) {
  d <- res[res$TEST == test, ]
  if (change) {
    b <- d[d$VISIT == "Baseline", ]
    d$STRESN <- d$STRESN - b$STRESN[match(d$USUBJID, b$USUBJID)]
  }
  rows <- lapply(at, function(v) {
    x <- d[d$VISIT == v, ]
    have <- x[!is.na(x$STRESN), ]
    n <- c(table(factor(have$ARM, levels = c("Placebo", "Treatment"))))
    row <- data.frame(visit = v, n_placebo = n[["Placebo"]], n_treatment = n[["Treatment"]],
      no_result = nrow(par) - nrow(x), missing = nrow(x) - nrow(have),
      tested = !(change && v == "Baseline"), difference = NA, lower = NA, upper = NA, p = NA, method = NA)
    if (row$tested) {
      t <- t.test(STRESN ~ ARM, data = have) # Placebo minus Treatment
      row$difference <- unname(t$estimate[1] - t$estimate[2])
      row$lower <- t$conf.int[1]; row$upper <- t$conf.int[2]; row$p <- t$p.value
      row$method <- t$method
    }
    row
  })
  out <- do.call(rbind, rows)
  out$p_holm <- NA; out$p_bh <- NA
  out$p_holm[out$tested] <- p.adjust(out$p[out$tested], "holm")
  out$p_bh[out$tested] <- p.adjust(out$p[out$tested], "BH")
  out
}
o$il6 <- by_visit("IL-6")
o$ddimer <- by_visit("D-dimer")
o$il6_change <- by_visit("IL-6", change = TRUE)
# With Week 2 named as unscheduled, the four visits left are tested, and adjusted, alone.
o$il6_without_week_2 <- by_visit("IL-6", at = setdiff(visits, "Week 2"))

# Fisher's exact test of a table with a small column: response by CRP at
# Baseline cut at 9.5, where a value on the point is in the lower group.
crp <- res[res$TEST == "CRP" & res$VISIT == "Baseline", ]
x <- crp$STRESN[match(par$USUBJID, crp$USUBJID)]
side <- factor(ifelse(x <= 9.5, "low", "high"), levels = c("low", "high"))
t <- table(par$RESPONSE, side)
f <- fisher.test(t)
o$fisher_small <- list(counts = as.data.frame.matrix(t),
  row_percent = as.data.frame.matrix(round(100 * prop.table(t, 1), 1)),
  column_totals = as.list(colSums(t)), row_totals = as.list(rowSums(t)),
  p = f$p.value, odds_ratio = unname(f$estimate), or_ci = as.numeric(f$conf.int), method = f$method)

jsonlite::write_json(o, args[2], auto_unbox = TRUE, digits = NA, pretty = TRUE, dataframe = "rows", na = "null")
cat("done\n")
