#!/usr/bin/env Rscript
# Takes the stills of the v0.4.0 demo page and reads the numbers it quotes.
#
#   Rscript capture.R <gsm.bio checkout> <output folder>
#
# The app is run by a second R session on this machine, from the checkout, and
# opened in a headless Chrome with chromote, as gsm.bio's own tests of it do
# (its tests/testthat/helper-browser.R is sourced for that). Nothing is
# deployed anywhere: the app has no public address.
#
# It writes the stills into <output folder>/media/ and what it read into
# <output folder>/capture-numbers.json: each number the page printed beside
# what the matching gsm.bio function returns when called directly on the same
# rows. It stops when the two differ.
#
# Needs devtools, shiny, haven, chromote, jsonlite and a Chrome or Chromium.

chrArgs <- commandArgs(trailingOnly = TRUE)
if (length(chrArgs) != 2L) stop("usage: Rscript capture.R <gsm.bio checkout> <output folder>", call. = FALSE)
strCheckout <- normalizePath(chrArgs[1])
strOut <- normalizePath(chrArgs[2])
strMedia <- file.path(strOut, "media")
dir.create(strMedia, showWarnings = FALSE)

setwd(strCheckout)
suppressMessages(devtools::load_all(quiet = TRUE))
for (strHelper in c("helper-source-tree.R", "helper-browser.R")) {
  source(file.path("tests", "testthat", strHelper))
}
bSourceTree <- function() TRUE
strSourceRoot <- function() strCheckout

lNumbers <- list(
  taken = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  r_version = paste(R.version$major, R.version$minor, sep = "."),
  gsm_bio_version = as.character(utils::packageVersion("gsm.bio")),
  gsm_bio_commit = system2("git", c("rev-parse", "HEAD"), stdout = TRUE)
)

# ---- a browser on a page of the app ------------------------------------------
Open <- function(strAddress, nWidth, nHeight) {
  lBrowser <- lStartBrowser(nWidth, nHeight)
  lBrowser$Runtime$enable()
  lLoaded <- lBrowser$Page$loadEventFired(wait_ = FALSE, timeout_ = nBrowserPatience)
  lBrowser$Page$navigate(strAddress, wait_ = FALSE)
  lBrowser$wait_for(lLoaded)
  Evaluate <- function(strCode) {
    lAnswer <- lBrowser$Runtime$evaluate(
      sprintf("Promise.resolve(%s).then((value) => JSON.stringify(value === undefined ? null : value))", strCode),
      awaitPromise = TRUE, returnByValue = TRUE, timeout_ = nBrowserPatience
    )
    if (!is.null(lAnswer$exceptionDetails)) stop("the page raised: ", lAnswer$exceptionDetails$exception$description, call. = FALSE)
    jsonlite::fromJSON(lAnswer$result$value, simplifyVector = FALSE)
  }
  lPage <- list(
    Evaluate = Evaluate,
    Upload = function(strSelector, strUpload) {
      nRoot <- lBrowser$DOM$getDocument()$root$nodeId
      nInput <- lBrowser$DOM$querySelector(nRoot, strSelector)$nodeId
      lBrowser$DOM$setFileInputFiles(files = list(normalizePath(strUpload)), nodeId = nInput)
    },
    Picture = function(strName, strSelector = "html", nScale = 2) {
      strFile <- file.path(strMedia, strName)
      lBrowser$screenshot(strFile, selector = strSelector, scale = nScale, show = FALSE, options = list(quality = 88))
      cat("  wrote", strName, "\n")
      invisible(strFile)
    },
    Close = function() invisible(tryCatch(lBrowser$close(), error = function(cndError) NULL))
  )
  lPage
}
Wait <- function(lPage, strCondition, strWhat, nSeconds = 60) {
  if (!bWaitFor(lPage, strCondition, nSeconds)) stop("waited ", nSeconds, " seconds and never saw: ", strWhat, call. = FALSE)
  # A moment for the browser to paint what it has just been given.
  Sys.sleep(0.6)
}
Chart <- function(strChart) sprintf("(HTMLWidgets.find('#%s') && HTMLWidgets.find('#%s').chart())", strChart, strChart)
Answered <- function(strChart) {
  sprintf("(%s && %s.statistics().length > 0 && %s.statistics().every((asked) => asked.answer))", Chart(strChart), Chart(strChart), Chart(strChart))
}
Go <- function(lPage, strView) lPage$Evaluate(sprintf("document.querySelector('a[data-value=\"%s\"]').click()", strView))
Foot <- function(lPage, strChart) {
  lPage$Evaluate(sprintf("Array.from(document.querySelectorAll('#%s .bv-foot-line')).map((line) => line.textContent).join(' ')", strChart))
}
Lines <- function(lPage, strChart) {
  unlist(lPage$Evaluate(sprintf("Array.from(document.querySelectorAll('#%s .bv-statistic')).map((line) => line.textContent)", strChart)))
}
Choose <- function(lPage, strChart, strControl, strValue) {
  lPage$Evaluate(sprintf(
    "(() => { const node = document.querySelector('#%s select[data-control=\"%s\"]'); node.value = '%s'; node.dispatchEvent(new Event('change', { bubbles: true })); return node.value; })()",
    strChart, strControl, strValue
  ))
}
# What the chart asked R and what it was answered, as the page holds it.
Asked <- function(lPage, strChart) lPage$Evaluate(sprintf("%s.statistics()", Chart(strChart)))
# The same request as a widget made in this session stores it: every stored
# result is an Analyze_*() function's answer for the rows the chart draws, so
# this is R called directly, with no page and no session between.
Stored <- function(lSettings) {
  lResults <- Widget_GroupComparison(Synthetic_Results, Synthetic_Participants, lSettings = lSettings)$x$lStatistics$results
  stats::setNames(lResults, vapply(lResults, function(lResult) Chart_KeyText(lResult[c("name", "args", "dataId")]), character(1)))
}
Hold <- function(strWhat, lAsked, lSettings) {
  lStored <- Stored(lSettings)
  strKey <- Chart_KeyText(lAsked[c("name", "args", "dataId")])
  if (!strKey %in% names(lStored)) stop(strWhat, ": a widget of these settings does not ask what the page asked", call. = FALSE)
  lDirect <- lStored[[strKey]]$value
  if (!isTRUE(all.equal(lAsked$answer$value, lDirect, tolerance = 1e-14))) {
    stop(strWhat, ": the page's answer is not what ", lAsked$name, "() returns for the same rows", call. = FALSE)
  }
  cat("  held:", strWhat, "\n")
  list(name = lAsked$name, form = lAsked$answer$form, computed_by = lAsked$answer$computedBy, page = lAsked$answer$value, direct = lDirect)
}

# ---- 01 and 02: the app as it opens, and a view answered by the session -------
cat("The app on the synthetic study\n")
lApp <- lRunApp("RunApp()")
lPage <- Open(lApp$address, 1280L, 900L)
Wait(lPage, Chart("GroupComparison"), "the group comparison drawn")
Wait(lPage, "document.querySelectorAll('#GroupComparison button.bv-tile').length === 12", "twelve tiles")
lNumbers$opens <- list(
  charts = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('a[data-value]')).map((node) => node.textContent.trim())")),
  source = lPage$Evaluate("document.querySelector('#gsm_bio_source').textContent"),
  foot = Foot(lPage, "GroupComparison")
)
lNumbers$opens$text_size <- lPage$Evaluate("({ root: getComputedStyle(document.documentElement).fontSize, foot: getComputedStyle(document.querySelector('#GroupComparison .bv-foot-line')).fontSize })")
lPage$Picture("app-opens.jpg")

# IL-6 across the visits: R's test under each visit, asked of the session.
lPage$Evaluate("Array.from(document.querySelectorAll('#GroupComparison button.bv-tile')).find((node) => node.dataset.measure === 'IL-6').click()")
Wait(lPage, Answered("GroupComparison"), "IL-6 over time answered")
lTime <- Asked(lPage, "GroupComparison")
lNumbers$over_time <- list(
  held = Hold("IL-6 across the visits", lTime[[1]], list(start_value = "IL-6", group_by = "ARM")),
  row = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('#GroupComparison tr[data-row=\"test\"] td[data-visit]')).map((node) => node.dataset.visit + ': ' + node.textContent)")),
  foot = Foot(lPage, "GroupComparison")
)
lPage$Picture("over-time.jpg")

# Week 4 alone, then the rank-sum test: a view no saved widget of these
# settings stores.
lPage$Evaluate("Array.from(document.querySelectorAll('#GroupComparison button.bv-time-visit')).find((node) => node.dataset.visit === 'Week 4').click()")
Wait(lPage, sprintf("%s.root.dataset.level === 'visits' && %s", Chart("GroupComparison"), Answered("GroupComparison")), "Week 4 answered")
lWelch <- Asked(lPage, "GroupComparison")
lNumbers$one_visit <- list(held = Hold("IL-6 at Week 4, Welch", lWelch[[1]], list(start_value = "IL-6", visits = "Week 4", group_by = "ARM")), line = Lines(lPage, "GroupComparison"))
Choose(lPage, "GroupComparison", "test", "wilcoxon")
Wait(
  lPage,
  sprintf("%s.statistics().length === 1 && %s.statistics()[0].args.strMethod === 'wilcoxon' && %s.statistics()[0].answer", Chart("GroupComparison"), Chart("GroupComparison"), Chart("GroupComparison")),
  "the rank-sum test answered"
)
lRank <- Asked(lPage, "GroupComparison")
lNumbers$rank_sum <- list(held = Hold("IL-6 at Week 4, rank-sum", lRank[[1]], list(start_value = "IL-6", visits = "Week 4", group_by = "ARM", test = "wilcoxon")), line = Lines(lPage, "GroupComparison"), foot = Foot(lPage, "GroupComparison"))
lPage$Picture("server-answer.jpg")

# The same move in a saved widget of the same settings: what a page with no R
# says of a view it does not store.
strSaved <- strSavedFile(Widget_GroupComparison(
  Synthetic_Results, Synthetic_Participants,
  lSettings = list(start_value = "IL-6", visits = "Week 4", group_by = "ARM")
), "saved")
lSaved <- Open(paste0("file://", strSaved), 1280L, 900L)
strSavedChart <- "HTMLWidgets.find('#' + document.querySelector('.html-widget').id).chart()"
Wait(lSaved, sprintf("%s.statistics().length > 0 && %s.statistics().every((asked) => asked.answer)", strSavedChart, strSavedChart), "the saved widget answered from its store")
lSaved$Evaluate("(() => { const node = document.querySelector('select[data-control=\"test\"]'); node.value = 'wilcoxon'; node.dispatchEvent(new Event('change', { bubbles: true })); return node.value; })()")
Wait(lSaved, sprintf("%s.statistics()[0].args.strMethod === 'wilcoxon' && %s.statistics()[0].answer", strSavedChart, strSavedChart), "the saved widget's answer for the rank-sum test")
lNumbers$saved <- list(
  status = lSaved$Evaluate(sprintf("%s.statistics()[0].answer.status", strSavedChart)),
  line = unlist(lSaved$Evaluate("Array.from(document.querySelectorAll('.bv-statistic')).map((line) => line.textContent)"))
)
lSaved$Picture("saved-widget.jpg")
lSaved$Close()

# The other five charts, each opened and answered: their footnotes.
lNumbers$charts <- list()
for (strChart in setdiff(names(chrAppCharts), "GroupComparison")) {
  Go(lPage, strChart)
  Wait(lPage, Answered(strChart), paste(strChart, "answered"))
  lAsked <- Asked(lPage, strChart)
  lNumbers$charts[[strChart]] <- list(
    asked = vapply(lAsked, function(lOne) lOne$name, character(1)),
    forms = vapply(lAsked, function(lOne) lOne$answer$form, character(1)),
    foot = Foot(lPage, strChart)
  )
}
lPage$Picture("survival.jpg")
lPage$Close()

# On a phone.
lPhone <- Open(lApp$address, 390L, 844L)
Wait(lPhone, "document.querySelectorAll('#GroupComparison button.bv-tile').length === 12", "twelve tiles on a phone")
lNumbers$phone <- list(
  wide = lPhone$Evaluate("document.documentElement.scrollWidth"),
  window = lPhone$Evaluate("window.innerWidth")
)
lPhone$Picture("app-phone.jpg")
lPhone$Close()
lApp$Stop()

# ---- 03: a reader's own file -------------------------------------------------
cat("A reader's own file\n")
# The synthetic results under a study's own column names, as SAS transport.
dfOwn <- Synthetic_Results
names(dfOwn)[match(c("USUBJID", "TEST", "STRESN"), names(dfOwn))] <- c("SUBJID", "LBTEST", "LBSTRESN")
strDir <- tempfile("demo-files")
dir.create(strDir)
strResults <- file.path(strDir, "lb.xpt")
haven::write_xpt(dfOwn, strResults)
dfPeople <- Synthetic_Participants
strPeople <- file.path(strDir, "dm.csv")
utils::write.csv(dfPeople, strPeople, row.names = FALSE)
lNumbers$own_file <- list(results = "lb.xpt", columns = names(dfOwn), participants = "dm.csv", rows = nrow(dfOwn))

lApp <- lRunApp("RunApp()")
lPage <- Open(lApp$address, 1280L, 900L)
Wait(lPage, Chart("GroupComparison"), "the group comparison drawn")
Go(lPage, "Data")
Wait(lPage, "document.querySelector('#gsm_bio_view table')", "the Data view, with the rows that are loaded")
Viewer <- function() {
  list(
    tabs = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('#gsm_bio_view_tabs .nav-tabs a')).map((tab) => tab.textContent.trim())")),
    said = lPage$Evaluate("document.querySelector('#gsm_bio_view .gsm-bio-app-what').textContent"),
    header = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('#gsm_bio_view thead th')).map((cell) => cell.textContent)")),
    first = unlist(lPage$Evaluate("Array.from(document.querySelector('#gsm_bio_view tbody tr').cells).map((cell) => cell.textContent)"))
  )
}
lNumbers$own_file$viewer_opens <- Viewer()
lPage$Picture("data-empty.jpg")
lPage$Upload("#gsm_bio_file_results", strResults)
Wait(lPage, "document.querySelector('#gsm_bio_column_results_USUBJID')", "the results columns asked for")
lPage$Upload("#gsm_bio_file_participants", strPeople)
Wait(lPage, "document.querySelector('#gsm_bio_column_participants_USUBJID')", "the participants column asked for")
lNumbers$own_file$preview <- list(
  said = lPage$Evaluate("Array.from(document.querySelectorAll('#gsm_bio_columns_results .gsm-bio-app-what')).map((node) => node.textContent)"),
  header = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('#gsm_bio_columns_results thead th')).map((cell) => cell.textContent)"))
)
lNumbers$own_file$guessed <- lPage$Evaluate("Object.fromEntries(Array.from(document.querySelectorAll('select[id^=\"gsm_bio_column_\"]')).map((node) => [node.id, node.value]))")
lPage$Picture("data-asked.jpg")

# Apply with three columns unsaid: a sentence, and nothing drawn on it.
lPage$Evaluate("document.querySelector('#gsm_bio_apply').click()")
Wait(lPage, "document.querySelector('#gsm_bio_data_said').textContent.trim().length > 0", "what the Data view says of a table half said")
lNumbers$own_file$half_said <- lPage$Evaluate("document.querySelector('#gsm_bio_data_said').textContent.trim()")
lNumbers$own_file$source_after_refusal <- lPage$Evaluate("document.querySelector('#gsm_bio_source').textContent")
lPage$Picture("data-refused.jpg")

for (strPair in list(c("USUBJID", "SUBJID"), c("TEST", "LBTEST"), c("STRESN", "LBSTRESN"))) {
  lPage$Evaluate(sprintf(
    "(() => { const node = document.querySelector('#gsm_bio_column_results_%s'); node.value = '%s'; node.dispatchEvent(new Event('change', { bubbles: true })); return node.value; })()",
    strPair[1], strPair[2]
  ))
}
Sys.sleep(0.5)
lPage$Evaluate("(() => { window.gsmBioWas = HTMLWidgets.find('#GroupComparison').chart(); return true; })()")
lPage$Evaluate("document.querySelector('#gsm_bio_apply').click()")
Wait(lPage, "document.querySelector('#gsm_bio_source').textContent.includes('lb.xpt')", "the charts drawn on the reader's file")
lNumbers$own_file$source <- lPage$Evaluate("document.querySelector('#gsm_bio_source').textContent")
Wait(lPage, "document.querySelector('#gsm_bio_view .gsm-bio-app-what').textContent.includes('lb.xpt')", "the viewer on the reader's file")
lNumbers$own_file$viewer_applied <- Viewer()
lPage$Picture("data-applied.jpg")
Go(lPage, "GroupComparison")
Wait(lPage, sprintf("%s && %s !== window.gsmBioWas && document.querySelectorAll('#GroupComparison button.bv-tile').length === 12", Chart("GroupComparison"), Chart("GroupComparison")), "the tiles drawn on the reader's file")
lPage$Evaluate("Array.from(document.querySelectorAll('#GroupComparison button.bv-tile')).find((node) => node.dataset.measure === 'IL-6').click()")
Wait(lPage, Answered("GroupComparison"), "IL-6 over time on the reader's file")
lOwn <- Asked(lPage, "GroupComparison")
lNumbers$own_file$over_time <- list(
  held = Hold("IL-6 across the visits, on the reader's file", lOwn[[1]], list(start_value = "IL-6", group_by = "ARM")),
  same_as_packaged = isTRUE(all.equal(lOwn[[1]]$answer$value, lTime[[1]]$answer$value, tolerance = 1e-14)),
  row = unlist(lPage$Evaluate("Array.from(document.querySelectorAll('#GroupComparison tr[data-row=\"test\"] td[data-visit]')).map((node) => node.dataset.visit + ': ' + node.textContent)"))
)
if (!lNumbers$own_file$over_time$same_as_packaged) stop("the reader's file gave another answer than the packaged study", call. = FALSE)
lPage$Picture("data-drawn.jpg")
lPage$Close()
lApp$Stop()

writeLines(jsonlite::toJSON(lNumbers, auto_unbox = TRUE, pretty = TRUE, digits = NA, null = "null"), file.path(strOut, "capture-numbers.json"))
cat("wrote capture-numbers.json\n")
