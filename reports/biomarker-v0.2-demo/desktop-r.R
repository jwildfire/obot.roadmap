# Desktop R: every number the demo page prints, recomputed straight from the
# synthetic study's three CSV files with base R and the survival package only.
# No gsm.bio function is called. jsonlite only writes the answers out.
#   Rscript desktop-r.R <folder of the three CSVs> <desktop-r.json>
args <- commandArgs(TRUE)
dir <- args[1]
suppressMessages(library(survival))
res <- read.csv(file.path(dir, "synthetic_results.csv"), stringsAsFactors = FALSE)
par <- read.csv(file.path(dir, "synthetic_participants.csv"), stringsAsFactors = FALSE)
out <- read.csv(file.path(dir, "synthetic_outcomes.csv"), stringsAsFactors = FALSE)
o <- list(r_version = R.version.string, survival = as.character(packageVersion("survival")),
  files_sha256 = vapply(c("synthetic_results.csv", "synthetic_participants.csv", "synthetic_outcomes.csv"),
    function(f) sub(" .*", "", system2("shasum", c("-a", "256", shQuote(file.path(dir, f))), stdout = TRUE)), ""),
  sizes = list(participants = nrow(par), results = nrow(res), outcomes = nrow(out),
    biomarkers = length(unique(res$TEST)), visits = length(unique(res$VISIT)),
    duplicate_result_rows = sum(duplicated(res[c("USUBJID", "VISIT", "TEST")]))))

# A biomarker's value at Baseline for every participant, in participant order.
baseline <- function(test) {
  b <- res[res$TEST == test & res$VISIT == "Baseline", ]
  b$STRESN[match(par$USUBJID, b$USUBJID)]
}
efs <- out[out$PARAMCD == "EFS", ]
d <- data.frame(USUBJID = par$USUBJID, ARM = par$ARM, RESPONSE = par$RESPONSE)
d$time <- efs$AVAL[match(d$USUBJID, efs$USUBJID)]
d$event <- as.integer(efs$CNSR[match(d$USUBJID, efs$USUBJID)] == 0) # CNSR 0 is an event
o$efs <- list(with_outcome = sum(!is.na(d$time)), events = sum(d$event, na.rm = TRUE))

# The cut rule: quantile() with its default (type 7); a value on the point is low.
crp <- baseline("CRP")
med <- unname(quantile(crp, 0.5, na.rm = TRUE))
o$crp_cut <- list(median = med, tertiles = unname(quantile(crp, c(1, 2) / 3, na.rm = TRUE)),
  low = sum(crp <= med, na.rm = TRUE), high = sum(crp > med, na.rm = TRUE))
side <- function(x, cut) factor(ifelse(x <= cut, "low", "high"), levels = c("low", "high"))

# 1. Cross-tabulation
ct <- function(a, b) {
  t <- table(a, b)
  chi <- suppressWarnings(chisq.test(t))
  f <- fisher.test(t)
  list(counts = as.data.frame.matrix(t), row_percent = as.data.frame.matrix(round(100 * prop.table(t, 1), 1)),
    chisq_method = chi$method, chisq_p = chi$p.value, min_expected = min(chi$expected),
    fisher_p = f$p.value, odds_ratio = unname(f$estimate), or_ci = as.numeric(f$conf.int))
}
o$crosstab_arm_response <- ct(d$ARM, d$RESPONSE)
d$crp_side <- side(crp, med)
o$crosstab_response_crp <- ct(d$RESPONSE, d$crp_side)
o$listing_nonresponder_high <- list(n = sum(d$RESPONSE == "Non-responder" & d$crp_side == "high"),
  first_ten = head(sort(d$USUBJID[d$RESPONSE == "Non-responder" & d$crp_side == "high"]), 10))

# 2. Stratified survival at a cut
surv_at <- function(x, cut) {
  g <- side(x, cut)
  keep <- !is.na(g) & !is.na(d$time)
  s <- Surv(d$time[keep], d$event[keep]); g <- g[keep]
  fit <- survfit(s ~ g, conf.type = "log-log")
  tab <- summary(fit)$table
  risk <- summary(fit, times = c(0, 5, 10, 15, 20), extend = TRUE)
  lr <- survdiff(s ~ g)
  cx <- coxph(s ~ g) # hazard in high over hazard in low
  list(cut = cut, n = as.list(c(table(g))),
    median = tab[, "median"], lower = tab[, "0.95LCL"], upper = tab[, "0.95UCL"],
    at_risk = split(risk$n.risk, as.character(risk$strata)),
    logrank_p = pchisq(lr$chisq, df = 1, lower.tail = FALSE),
    hazard_ratio = unname(exp(coef(cx))), hr_ci = unname(exp(confint(cx))))
}
o$survival_crp_median <- surv_at(crp, med)
o$survival_crp_dragged <- surv_at(crp, 4.34)

# 3. The screen's hazard rows at Baseline: each biomarker cut at its own median
#    among participants with a value and an outcome; p by log-rank, BH across rows.
tests <- sort(unique(res$TEST))
rows <- lapply(tests, function(b) {
  x <- baseline(b)
  m <- unname(quantile(x[!is.na(d$time)], 0.5, na.rm = TRUE))
  r <- surv_at(x, m)
  data.frame(biomarker = b, cut = m, hr = r$hazard_ratio, lower = r$hr_ci[1], upper = r$hr_ci[2],
    p = r$logrank_p, n_high = r$n$high, n_low = r$n$low, on_cut = sum(x == m, na.rm = TRUE))
})
scr <- do.call(rbind, rows)
scr$p_bh <- p.adjust(scr$p, "BH")
o$screen_hazard <- scr[order(-scr$hr), ]

# 4. The batch run's cross-tabulation across biomarkers: response by each
#    biomarker at Baseline cut at its own median.
o$batch_crosstab <- do.call(rbind, lapply(tests, function(b) {
  x <- baseline(b)
  m <- unname(quantile(x, 0.5, na.rm = TRUE))
  chi <- suppressWarnings(chisq.test(table(d$RESPONSE, side(x, m))))
  data.frame(biomarker = b, cut = m, method = chi$method, p = chi$p.value)
}))

jsonlite::write_json(o, args[2], auto_unbox = TRUE, digits = NA, pretty = TRUE, dataframe = "rows")
cat("done\n")
