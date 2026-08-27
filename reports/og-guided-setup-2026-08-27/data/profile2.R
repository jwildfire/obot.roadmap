source("/tmp/profile.R")
# Rank candidate (value, lo, hi) triples by STRUCTURAL agreement with a measure
# column -- each analyte should carry its own reference range -- instead of by
# how often value falls inside the range.
infer2 <- function(p) {
  nums <- Filter(function(x) x$isnum, p)
  cats <- Filter(function(x) !x$isnum && !x$isdate && x$card >= 3 && x$card <= 200 &&
                   x$card < x$n / 5, p)
  cands <- list()
  nm <- names(nums)
  for (a in nm) for (b in nm) for (c in nm) {
    if (a %in% c(b, c) || b == c) next
    lo <- nums[[b]]$num; hi <- nums[[c]]$num; val <- nums[[a]]$num
    k <- min(length(lo), length(hi), length(val)); if (k < 50) next
    ok  <- mean(lo[1:k] < hi[1:k], na.rm = TRUE);              if (ok <= 0.99) next
    inr <- mean(val[1:k] >= lo[1:k] & val[1:k] <= hi[1:k], na.rm = TRUE); if (inr <= 0.5) next
    # structural test: is there a categorical column giving ONE (lo,hi) per level?
    pur <- 0; mcol <- NA
    for (cn in names(cats)) {
      kk <- min(k, p[[cn]]$n)
      key <- paste(round(lo[1:kk], 6), round(hi[1:kk], 6))
      g <- split(key, p[[cn]]$chr[1:kk])
      s <- mean(sapply(g, function(z) length(unique(z))) == 1)
      if (s > pur) { pur <- s; mcol <- cn }
    }
    cands[[length(cands) + 1]] <- list(value = a, lo = b, hi = c,
                                       measure = mcol, purity = pur, inrange = inr)
  }
  if (!length(cands)) return(NULL)
  cands[order(-sapply(cands, `[[`, "purity"), -sapply(cands, `[[`, "inrange"))]
}
