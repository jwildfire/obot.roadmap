# Value profiler: infer ROLE from data shape, not from column name.
# Deliberately name-blind: column names are never read.
prof <- function(df, n = 5000) {
  if (nrow(df) > n) df <- df[sample(nrow(df), n), , drop = FALSE]
  lapply(names(df), function(cn) {
    v <- df[[cn]]; vv <- v[!is.na(v) & v != ""]
    num <- suppressWarnings(as.numeric(vv))
    isnum <- length(vv) > 0 && mean(!is.na(num)) > 0.98
    dt <- suppressWarnings(as.Date(as.character(vv), optional = TRUE))
    isdate <- length(vv) > 0 && mean(!is.na(dt)) > 0.95 && !isnum
    list(col = cn, n = length(vv), card = length(unique(vv)),
         isnum = isnum, isdate = isdate,
         num = if (isnum) num else NULL,
         vals = unique(vv), chr = as.character(vv))
  }) |> setNames(names(df))
}
UNIT <- "^(U/L|g/dL|mg/dL|mmol/L|umol/L|10\\^9/L|10\\^12/L|%|IU/L|ng/mL|mEq/L|L/L|fL|pg)$"
infer <- function(p, nrow_df) {
  out <- list()
  # unit column: low cardinality, values look like units
  u <- Filter(function(x) !x$isnum && x$card <= 30 &&
                mean(grepl(UNIT, x$vals, ignore.case = TRUE)) > 0.5, p)
  if (length(u)) out$unit_col <- names(u)[1]
  # measure column: character, 3..200 distinct, most rows repeat
  m <- Filter(function(x) !x$isnum && !x$isdate && x$card >= 3 && x$card <= 200 &&
                x$card < x$n / 5 && !identical(x$col, out$unit_col), p)
  # the result/lo/hi triple: numeric columns where lo <= val <= hi holds
  nums <- Filter(function(x) x$isnum, p)
  best <- NULL
  if (length(nums) >= 3) {
    nm <- names(nums)
    for (a in nm) for (b in nm) for (c in nm) {
      if (a %in% c(b, c) || b == c) next
      lo <- nums[[b]]$num; hi <- nums[[c]]$num; val <- nums[[a]]$num
      k <- min(length(lo), length(hi), length(val))
      if (k < 50) next
      ok <- mean(lo[1:k] < hi[1:k], na.rm = TRUE)          # lo strictly below hi, always
      inr <- mean(val[1:k] >= lo[1:k] & val[1:k] <= hi[1:k], na.rm = TRUE)
      sc <- ok * inr
      if (ok > 0.99 && inr > 0.5 && (is.null(best) || sc > best$sc))
        best <- list(value_col = a, normal_col_low = b, normal_col_high = c, sc = sc, inr = inr)
    }
  }
  if (!is.null(best)) { out$value_col <- best$value_col
    out$normal_col_low <- best$normal_col_low; out$normal_col_high <- best$normal_col_high
    out$.range_hit <- round(best$inr, 3) }
  # measure col = the categorical whose groups each have a distinct lo/hi pair
  if (length(m) && !is.null(out$normal_col_low)) {
    scores <- sapply(names(m), function(cn) {
      g <- split(p[[out$normal_col_low]]$num[seq_len(min(p[[cn]]$n, p[[out$normal_col_low]]$n))],
                 p[[cn]]$chr[seq_len(min(p[[cn]]$n, p[[out$normal_col_low]]$n))])
      mean(sapply(g, function(z) length(unique(round(z, 4)))) == 1)   # one LLN per level
    })
    out$measure_col <- names(which.max(scores)); out$.measure_purity <- round(max(scores), 3)
  }
  # visit column: categorical with visit-ish tokens
  vz <- Filter(function(x) !x$isnum && x$card <= 60 &&
                 mean(grepl("baseline|screen|week|day|visit|cycle|month|unsched|follow",
                            x$vals, ignore.case = TRUE)) > 0.5, p)
  if (length(vz)) out$visit_col <- names(vz)[1]
  # date column
  d <- Filter(function(x) x$isdate, p); if (length(d)) out$date_col <- names(d)[1]
  # id column: highest-cardinality character that still repeats
  ids <- Filter(function(x) !x$isnum && !x$isdate && x$card > 20 && x$card < x$n, p)
  if (length(ids)) out$id_col <- names(ids)[which.max(sapply(ids, function(x) x$card))]
  out
}
