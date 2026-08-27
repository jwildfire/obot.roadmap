/* Real rows from the constructed CRO delivery. Values are demo-301 study data
   renamed into a CRO-shaped ADaM + central-lab package; see README.md. */
window.DELIVERY = {
  adsl: { cols: ["STUDYID","USUBJID","SUBJID","SITEID","COUNTRY","AGE","AGEU","SEX","RACE","ARM","ACTARM","SAFFL","RANDFL","TRTSDT","TRTDURD","TR01DURD"],
    rows: [
      ["AA-AA-000-0000","AA-AA-000-0000-S384","S384","SITE4323","US","23","YEARS","M","White","SCREEN FAILURE","SCREEN FAILURE","N","N","","NA","NA"],
      ["AA-AA-000-0000","AA-AA-000-0000-S71069","S71069","SITE8799","UK","46","YEARS","F","White","Placebo","Placebo","Y","Y","2012-01-10","47","107"],
      ["AA-AA-000-0000","AA-AA-000-0000-S85511","S85511","SITE8517","UK","40","YEARS","F","Other","Drug 80mg","Drug 80mg","Y","Y","2012-01-24","33","93"],
      ["AA-AA-000-0000","AA-AA-000-0000-S32854","S32854","SITE6603","UK","32","YEARS","M","Asian","Drug 80mg","Drug 80mg","Y","Y","2012-01-23","34","94"],
      ["AA-AA-000-0000","AA-AA-000-0000-S3492","S3492","SITE8354","Japan","41","YEARS","F","Black","Placebo","Placebo","Y","Y","2012-01-12","45","105"],
      ["AA-AA-000-0000","AA-AA-000-0000-S69485","S69485","SITE5033","US","50","YEARS","F","White","Placebo","Placebo","Y","Y","2012-01-08","49","109"]
    ] },
  lab: { cols: ["STUDY","SUBJECT","VISIT","VISITNUM","LBDTC","LBTEST","LBORRES","LBORRESU","LBORNRLO","LBORNRHI","LBCAT"],
    rows: [
      ["AA-AA-000-0000","S1000","Baseline","1","2012-03-01","ALT","16","U/L","7","41","CHEMISTRY PANEL"],
      ["AA-AA-000-0000","S1000","Baseline","1","2012-03-01","ALBUMIN","4.4","g/dL","3.5","5","CHEMISTRY PANEL"],
      ["AA-AA-000-0000","S1000","Baseline","1","2012-03-01","Alk Phos","68","U/L","40","120","CHEMISTRY PANEL"],
      ["AA-AA-000-0000","S1000","Baseline","1","2012-03-01","SGOT","20","U/L","8","37","CHEMISTRY PANEL"],
      ["AA-AA-000-0000","S1000","Week 1","2","2012-03-08","SGOT","17","U/L","8","37","CHEMISTRY PANEL"],
      ["AA-AA-000-0000","S1000","Baseline","1","2012-03-01","TBILI","0.74","mg/dL","0.2","1.2","CHEMISTRY PANEL"]
    ] },
  labTests: ["ALBUMIN","Alk Phos","ALT","CREATININE","GAMMA GLUTAMYL TRANSFERASE","GLUCOSE","HEMATOCRIT","HEMOGLOBIN","LYMPHOCYTES","NEUTROPHILS","PLATELETS","POTASSIUM","SGOT","SODIUM","TBILI","WHITE BLOOD CELLS"],
  nAdsl: 1005, nLab: 57200, nEnrolled: 765
};
