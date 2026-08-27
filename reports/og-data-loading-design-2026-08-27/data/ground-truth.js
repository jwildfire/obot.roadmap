/* Ground truth derived on 2026-08-27 by running og_init(example = TRUE) and reading the
   44 workflow YAMLs it snapshots into the project. Domain -> metric reachability is
   COMPUTED from those specs (Raw_* -> Mapped_* -> metric), never typed.

   `adam` / `sdtm` / `aliases` is the standards table this design PROPOSES. gsm.mapping
   has no such asset today; safetyGraphics has its twin in safetyCharts::meta_*.

   `userExport` is one hand-authored CRO delivery, written independently of the alias
   lists so the matcher has something real to fail at. */
window.OGDATA = {
 "n_metrics": 25,
 "n_mappings": 13,
 "n_declarations": 90,
 "domains": [
  {
   "domain": "Raw_AE",
   "mappings": "AE",
   "produces": "Mapped_AE",
   "metrics": [
    "cou0001",
    "cou0002",
    "kri0001",
    "kri0002"
   ],
   "n_metrics": 4,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "AE",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "AE",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "aeser",
     "type": "character",
     "declared_in": "AE",
     "adam": "AESER",
     "sdtm": "AESER",
     "aliases": [
      "SERIOUS",
      "SERIOUS_YN",
      "SAE_FLAG"
     ],
     "critical": true
    },
    {
     "col": "aest_dt",
     "type": "Date",
     "declared_in": "AE",
     "adam": "ASTDT",
     "sdtm": "AESTDTC",
     "aliases": [
      "AESTDT",
      "AE_START_DATE",
      "ONSET_DATE"
     ],
     "critical": false
    },
    {
     "col": "aeen_dt",
     "type": "Date",
     "declared_in": "AE",
     "adam": "AENDT",
     "sdtm": "AEENDTC",
     "aliases": [
      "AEENDT",
      "AE_END_DATE",
      "RESOLUTION_DATE"
     ],
     "critical": false
    },
    {
     "col": "mdrpt_nsv",
     "type": "character",
     "declared_in": "AE",
     "adam": "AEDECOD",
     "sdtm": "AEDECOD",
     "aliases": [
      "PREFERRED_TERM",
      "PT",
      "MEDDRA_PT",
      "AEPT"
     ],
     "critical": false
    },
    {
     "col": "mdrsoc_nsv",
     "type": "character",
     "declared_in": "AE",
     "adam": "AEBODSYS",
     "sdtm": "AEBODSYS",
     "aliases": [
      "SOC",
      "SYSTEM_ORGAN_CLASS",
      "MEDDRA_SOC",
      "AESOC"
     ],
     "critical": false
    },
    {
     "col": "aetoxgr",
     "type": "integer",
     "declared_in": "AE",
     "adam": "ATOXGR",
     "sdtm": "AETOXGR",
     "aliases": [
      "AESEV",
      "GRADE",
      "CTCAE_GRADE",
      "TOXGRADE"
     ],
     "critical": false
    },
    {
     "col": "aeongo",
     "type": "character",
     "declared_in": "AE",
     "adam": null,
     "sdtm": "AEENRF",
     "aliases": [
      "AEONGO",
      "ONGOING",
      "AEONGOING"
     ],
     "critical": false
    },
    {
     "col": "aerel",
     "type": "character",
     "declared_in": "AE",
     "adam": "AREL",
     "sdtm": "AEREL",
     "aliases": [
      "RELATED",
      "CAUSALITY",
      "AERELATED"
     ],
     "critical": false
    },
    {
     "col": "mincreated_dts",
     "type": "timestamp",
     "declared_in": "AE",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "MINCREATED_DTS",
      "CREATED_DT",
      "RECORD_CREATED"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_DATACHG",
   "mappings": "DATACHG",
   "produces": "Mapped_DATACHG",
   "metrics": [
    "cou0008",
    "cou0011",
    "kri0008",
    "kri0011"
   ],
   "n_metrics": 4,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "DATACHG",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subject_nsv",
     "type": "character",
     "declared_in": "DATACHG",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "SUBJECTNAME",
      "SUBJNAME",
      "SUBJECT_NSV",
      "SUBJECT_LABEL"
     ],
     "critical": false
    },
    {
     "col": "n_changes",
     "type": "integer",
     "declared_in": "DATACHG",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "NCHANGES",
      "N_CHANGES",
      "CHANGE_COUNT",
      "AUDIT_COUNT"
     ],
     "critical": true
    },
    {
     "col": "visit_date",
     "type": "Date",
     "declared_in": "DATACHG",
     "adam": "ADT",
     "sdtm": "VISITDTC",
     "aliases": [
      "VISIT_DATE",
      "VISITDT",
      "VISDT"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_DATAENT",
   "mappings": "DATAENT",
   "produces": "Mapped_DATAENT",
   "metrics": [
    "cou0010",
    "kri0010"
   ],
   "n_metrics": 2,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "DATAENT",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subject_nsv",
     "type": "character",
     "declared_in": "DATAENT",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "SUBJECTNAME",
      "SUBJNAME",
      "SUBJECT_NSV",
      "SUBJECT_LABEL"
     ],
     "critical": false
    },
    {
     "col": "data_entry_lag",
     "type": "integer",
     "declared_in": "DATAENT",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "DATA_ENTRY_LAG",
      "ENTRY_LAG",
      "LAG_DAYS"
     ],
     "critical": true
    },
    {
     "col": "visit_date",
     "type": "Date",
     "declared_in": "DATAENT",
     "adam": "ADT",
     "sdtm": "VISITDTC",
     "aliases": [
      "VISIT_DATE",
      "VISITDT",
      "VISDT"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_ENROLL",
   "mappings": "ENROLL",
   "produces": "Mapped_ENROLL",
   "metrics": [
    "cou0012",
    "kri0012"
   ],
   "n_metrics": 2,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "invid",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": "SITEID",
     "sdtm": "SITEID",
     "aliases": [
      "SITE",
      "SITENUM",
      "SITE_NUMBER",
      "CENTER",
      "CENTRE",
      "INVID",
      "PI_NUMBER"
     ],
     "critical": true
    },
    {
     "col": "country",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": "COUNTRY",
     "sdtm": "COUNTRY",
     "aliases": [
      "CNTRY",
      "COUNTRY_CODE"
     ],
     "critical": true
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": false
    },
    {
     "col": "subjectid",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": true
    },
    {
     "col": "enrollyn",
     "type": "character",
     "declared_in": "ENROLL",
     "adam": "ENRLFL",
     "sdtm": "ENRLFL",
     "aliases": [
      "ENROLLED",
      "ENROLLYN",
      "ENROLL_FLAG"
     ],
     "critical": true
    },
    {
     "col": "enroll_dt",
     "type": "Date",
     "declared_in": "ENROLL",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_LB",
   "mappings": "LB",
   "produces": "Mapped_LB",
   "metrics": [
    "cou0005",
    "kri0005"
   ],
   "n_metrics": 2,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "LB",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "LB",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "toxgrg_nsv",
     "type": "character",
     "declared_in": "LB",
     "adam": "ATOXGR",
     "sdtm": "LBTOXGR",
     "aliases": [
      "LAB_GRADE",
      "TOXGRADE",
      "CTCAE_GRADE"
     ],
     "critical": true
    },
    {
     "col": "lb_dt",
     "type": "Date",
     "declared_in": "LB",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_PD",
   "mappings": "PD",
   "produces": "Mapped_PD",
   "metrics": [
    "cou0003",
    "cou0004",
    "kri0003",
    "kri0004"
   ],
   "n_metrics": 4,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "PD",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "PD",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "deemedimportant",
     "type": "character",
     "declared_in": "PD",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": true
    },
    {
     "col": "dvdecod",
     "type": "character",
     "declared_in": "PD",
     "adam": "DVDECOD",
     "sdtm": "DVDECOD",
     "aliases": [
      "DEVIATION_CODE",
      "PD_CODE",
      "CROCATEGORY"
     ],
     "critical": false
    },
    {
     "col": "dvterm",
     "type": "character",
     "declared_in": "PD",
     "adam": "DVTERM",
     "sdtm": "DVTERM",
     "aliases": [
      "DEVIATION_TERM",
      "DESCRIPTION",
      "PD_TERM"
     ],
     "critical": false
    },
    {
     "col": "dvdtm",
     "type": "timestamp",
     "declared_in": "PD",
     "adam": "ADT",
     "sdtm": "DVSTDTC",
     "aliases": [
      "DEVIATION_DATE",
      "DEVIATIONDATE",
      "PD_DATE"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_QUERY",
   "mappings": "QUERY",
   "produces": "Mapped_QUERY",
   "metrics": [
    "cou0008",
    "cou0009",
    "kri0008",
    "kri0009"
   ],
   "n_metrics": 4,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "QUERY",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subject_nsv",
     "type": "character",
     "declared_in": "QUERY",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "SUBJECTNAME",
      "SUBJNAME",
      "SUBJECT_NSV",
      "SUBJECT_LABEL"
     ],
     "critical": false
    },
    {
     "col": "querystatus",
     "type": "character",
     "declared_in": "QUERY",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "QUERY_STATUS",
      "STATUS",
      "QRYSTATUS"
     ],
     "critical": true
    },
    {
     "col": "queryage",
     "type": "integer",
     "declared_in": "QUERY",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "QUERY_AGE",
      "AGE_DAYS",
      "DAYS_OPEN"
     ],
     "critical": true
    },
    {
     "col": "created",
     "type": "Date",
     "declared_in": "QUERY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_SDRGCOMP",
   "mappings": "SDRGCOMP",
   "produces": "Mapped_SDRGCOMP",
   "metrics": [
    "cou0007",
    "kri0007"
   ],
   "n_metrics": 2,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "SDRGCOMP",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "SDRGCOMP",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "sdrgyn",
     "type": "character",
     "declared_in": "SDRGCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": true
    },
    {
     "col": "phase",
     "type": "character",
     "declared_in": "SDRGCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": true
    },
    {
     "col": "mincreated_dts",
     "type": "timestamp",
     "declared_in": "SDRGCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "MINCREATED_DTS",
      "CREATED_DT",
      "RECORD_CREATED"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_SITE",
   "mappings": "SITE",
   "produces": "Mapped_SITE",
   "metrics": [],
   "n_metrics": 0,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "SITE",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "invid",
     "type": "character",
     "declared_in": "SITE",
     "adam": "SITEID",
     "sdtm": "SITEID",
     "aliases": [
      "SITE",
      "SITENUM",
      "SITE_NUMBER",
      "CENTER",
      "CENTRE",
      "INVID",
      "PI_NUMBER"
     ],
     "critical": false
    },
    {
     "col": "InvestigatorFirstName",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "InvestigatorLastName",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "site_status",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "City",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "State",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "Country",
     "type": "character",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "site_active_dt",
     "type": "Date",
     "declared_in": "SITE",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_STUDCOMP",
   "mappings": "STUDCOMP",
   "produces": "Mapped_STUDCOMP",
   "metrics": [
    "cou0006",
    "kri0006"
   ],
   "n_metrics": 2,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "STUDCOMP",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "invid",
     "type": "character",
     "declared_in": "STUDCOMP",
     "adam": "SITEID",
     "sdtm": "SITEID",
     "aliases": [
      "SITE",
      "SITENUM",
      "SITE_NUMBER",
      "CENTER",
      "CENTRE",
      "INVID",
      "PI_NUMBER"
     ],
     "critical": false
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": "STUDCOMP",
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "compyn",
     "type": "character",
     "declared_in": "STUDCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": true
    },
    {
     "col": "compreas",
     "type": "character",
     "declared_in": "STUDCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "mincreated_dts",
     "type": "timestamp",
     "declared_in": "STUDCOMP",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "MINCREATED_DTS",
      "CREATED_DT",
      "RECORD_CREATED"
     ],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_STUDY",
   "mappings": "STUDY",
   "produces": "Mapped_STUDY",
   "metrics": [],
   "n_metrics": 0,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": "STUDY",
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "nickname",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "protocol_title",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "status",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "num_plan_site",
     "type": "integer",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "num_plan_subj",
     "type": "integer",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "act_fpfv",
     "type": "Date",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "est_fpfv",
     "type": "Date",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "est_lplv",
     "type": "Date",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "est_lpfv",
     "type": "Date",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "db_lock_dt",
     "type": "Date",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "therapeutic_area",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "protocol_indication",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "phase",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    },
    {
     "col": "product",
     "type": "character",
     "declared_in": "STUDY",
     "adam": null,
     "sdtm": null,
     "aliases": [],
     "critical": false
    }
   ]
  },
  {
   "domain": "Raw_SUBJ",
   "mappings": [
    "STUDY",
    "SUBJ"
   ],
   "produces": [
    "Mapped_STUDY",
    "Mapped_SUBJ"
   ],
   "metrics": [
    "cou0001",
    "cou0002",
    "cou0003",
    "cou0004",
    "cou0005",
    "cou0006",
    "cou0007",
    "cou0008",
    "cou0009",
    "cou0010",
    "cou0011",
    "kri0001",
    "kri0002",
    "kri0003",
    "kri0004",
    "kri0005",
    "kri0006",
    "kri0007",
    "kri0008",
    "kri0009",
    "kri0010",
    "kri0011"
   ],
   "n_metrics": 22,
   "columns": [
    {
     "col": "studyid",
     "type": "character",
     "declared_in": [
      "STUDY",
      "SUBJ"
     ],
     "adam": "STUDYID",
     "sdtm": "STUDYID",
     "aliases": [
      "PROTOCOL",
      "PROTOCOLID",
      "STUDY",
      "STUDY_ID",
      "PROT"
     ],
     "critical": false
    },
    {
     "col": "invid",
     "type": "character",
     "declared_in": [
      "STUDY",
      "SUBJ"
     ],
     "adam": "SITEID",
     "sdtm": "SITEID",
     "aliases": [
      "SITE",
      "SITENUM",
      "SITE_NUMBER",
      "CENTER",
      "CENTRE",
      "INVID",
      "PI_NUMBER"
     ],
     "critical": true
    },
    {
     "col": "subjid",
     "type": "character",
     "declared_in": [
      "STUDY",
      "SUBJ"
     ],
     "adam": "USUBJID",
     "sdtm": "USUBJID",
     "aliases": [
      "SUBJID",
      "SUBJECT_ID",
      "SUBJECTID",
      "SUBJECT",
      "PATIENT_ID",
      "PT_ID",
      "SUBJECTENROLLMENTNUMBER"
     ],
     "critical": true
    },
    {
     "col": "enrollyn",
     "type": "character",
     "declared_in": [
      "STUDY",
      "SUBJ"
     ],
     "adam": "ENRLFL",
     "sdtm": "ENRLFL",
     "aliases": [
      "ENROLLED",
      "ENROLLYN",
      "ENROLL_FLAG"
     ],
     "critical": false
    },
    {
     "col": "country",
     "type": "character",
     "declared_in": "SUBJ",
     "adam": "COUNTRY",
     "sdtm": "COUNTRY",
     "aliases": [
      "CNTRY",
      "COUNTRY_CODE"
     ],
     "critical": true
    },
    {
     "col": "subject_nsv",
     "type": "character",
     "declared_in": "SUBJ",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "SUBJECTNAME",
      "SUBJNAME",
      "SUBJECT_NSV",
      "SUBJECT_LABEL"
     ],
     "critical": false
    },
    {
     "col": "timeonstudy",
     "type": "integer",
     "declared_in": "SUBJ",
     "adam": "TRTDURD",
     "sdtm": null,
     "aliases": [
      "DAYS_ON_STUDY",
      "TIMEONSTUDY",
      "STUDYDUR"
     ],
     "critical": true
    },
    {
     "col": "firstparticipantdate",
     "type": "Date",
     "declared_in": "SUBJ",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "FIRSTPARTICIPANTDATE",
      "FPFV",
      "FIRST_VISIT_DT"
     ],
     "critical": false
    },
    {
     "col": "firstdosedate",
     "type": "Date",
     "declared_in": "SUBJ",
     "adam": "TRTSDT",
     "sdtm": "RFXSTDTC",
     "aliases": [
      "FIRSTDOSEDATE",
      "FIRST_DOSE_DT",
      "TRTSDTM"
     ],
     "critical": false
    },
    {
     "col": "timeontreatment",
     "type": "integer",
     "declared_in": "SUBJ",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "TIMEONTREATMENT",
      "DAYS_ON_TREATMENT",
      "TRTDURD"
     ],
     "critical": false
    },
    {
     "col": "agerep",
     "type": "integer",
     "declared_in": "SUBJ",
     "adam": "AGE",
     "sdtm": "AGE",
     "aliases": [
      "AGEYR",
      "AGEREP",
      "AGE_AT_ENROLL"
     ],
     "critical": false
    },
    {
     "col": "sex",
     "type": "character",
     "declared_in": "SUBJ",
     "adam": "SEX",
     "sdtm": "SEX",
     "aliases": [
      "GENDER"
     ],
     "critical": false
    },
    {
     "col": "race",
     "type": "character",
     "declared_in": "SUBJ",
     "adam": "RACE",
     "sdtm": "RACE",
     "aliases": [],
     "critical": false
    },
    {
     "col": "mincreated_dts",
     "type": "timestamp",
     "declared_in": "SUBJ",
     "adam": null,
     "sdtm": null,
     "aliases": [
      "MINCREATED_DTS",
      "CREATED_DT",
      "RECORD_CREATED"
     ],
     "critical": false
    }
   ]
  }
 ],
 "metrics": {
  "cou0001": {
   "id": "cou0001",
   "abbr": "AE",
   "metric": "Adverse Event Rate",
   "level": "Country",
   "needs": [
    "Raw_AE",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_AE$subjid",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "cou0002": {
   "id": "cou0002",
   "abbr": "SAE",
   "metric": "Serious Adverse Event Rate",
   "level": "Country",
   "needs": [
    "Raw_AE",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_AE$subjid",
    "Raw_AE$aeser",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "cou0003": {
   "id": "cou0003",
   "abbr": "PD",
   "metric": "Non-Important Protocol Deviation Rate",
   "level": "Country",
   "needs": [
    "Raw_PD",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_PD$subjid",
    "Raw_PD$deemedimportant",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "cou0004": {
   "id": "cou0004",
   "abbr": "IPD",
   "metric": "Important Protocol Deviation Rate",
   "level": "Country",
   "needs": [
    "Raw_PD",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_PD$subjid",
    "Raw_PD$deemedimportant",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "cou0005": {
   "id": "cou0005",
   "abbr": "LB",
   "metric": "Grade 3+ Lab Abnormality Rate",
   "level": "Country",
   "needs": [
    "Raw_LB",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_LB$subjid",
    "Raw_LB$toxgrg_nsv"
   ]
  },
  "cou0006": {
   "id": "cou0006",
   "abbr": "SDSC",
   "metric": "Study Discontinuation Rate",
   "level": "Country",
   "needs": [
    "Raw_STUDCOMP",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_STUDCOMP$subjid",
    "Raw_STUDCOMP$compyn"
   ]
  },
  "cou0007": {
   "id": "cou0007",
   "abbr": "TDSC",
   "metric": "Treatment Discontinuation Rate",
   "level": "Country",
   "needs": [
    "Raw_SDRGCOMP",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_SDRGCOMP$subjid",
    "Raw_SDRGCOMP$sdrgyn",
    "Raw_SDRGCOMP$phase"
   ]
  },
  "cou0008": {
   "id": "cou0008",
   "abbr": "QRY",
   "metric": "Query Rate",
   "level": "Country",
   "needs": [
    "Raw_DATACHG",
    "Raw_QUERY",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_QUERY$querystatus",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country"
   ]
  },
  "cou0009": {
   "id": "cou0009",
   "abbr": "OQRY",
   "metric": "Delayed Query Resolution Rate",
   "level": "Country",
   "needs": [
    "Raw_QUERY",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_QUERY$querystatus",
    "Raw_QUERY$queryage"
   ]
  },
  "cou0010": {
   "id": "cou0010",
   "abbr": "ODAT",
   "metric": "Delayed Data Entry Rate",
   "level": "Country",
   "needs": [
    "Raw_DATAENT",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_DATAENT$data_entry_lag"
   ]
  },
  "cou0011": {
   "id": "cou0011",
   "abbr": "CDAT",
   "metric": "Data Change Rate",
   "level": "Country",
   "needs": [
    "Raw_DATACHG",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$country",
    "Raw_DATACHG$n_changes"
   ]
  },
  "cou0012": {
   "id": "cou0012",
   "abbr": "SF",
   "metric": "Screen Failure Rate",
   "level": "Country",
   "needs": [
    "Raw_ENROLL"
   ],
   "needsCols": [
    "Raw_ENROLL$subjectid",
    "Raw_ENROLL$country",
    "Raw_ENROLL$enrollyn"
   ]
  },
  "kri0001": {
   "id": "kri0001",
   "abbr": "AE",
   "metric": "Adverse Event Rate",
   "level": "Site",
   "needs": [
    "Raw_AE",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_AE$subjid",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "kri0002": {
   "id": "kri0002",
   "abbr": "SAE",
   "metric": "Serious Adverse Event Rate",
   "level": "Site",
   "needs": [
    "Raw_AE",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_AE$subjid",
    "Raw_AE$aeser",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "kri0003": {
   "id": "kri0003",
   "abbr": "PD",
   "metric": "Non-Important Protocol Deviation Rate",
   "level": "Site",
   "needs": [
    "Raw_PD",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_PD$subjid",
    "Raw_PD$deemedimportant",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "kri0004": {
   "id": "kri0004",
   "abbr": "IPD",
   "metric": "Important Protocol Deviation Rate",
   "level": "Site",
   "needs": [
    "Raw_PD",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_PD$subjid",
    "Raw_PD$deemedimportant",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_SUBJ$timeonstudy"
   ]
  },
  "kri0005": {
   "id": "kri0005",
   "abbr": "LB",
   "metric": "Grade 3+ Lab Abnormality Rate",
   "level": "Site",
   "needs": [
    "Raw_LB",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_LB$subjid",
    "Raw_LB$toxgrg_nsv"
   ]
  },
  "kri0006": {
   "id": "kri0006",
   "abbr": "SDSC",
   "metric": "Study Discontinuation Rate",
   "level": "Site",
   "needs": [
    "Raw_STUDCOMP",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_STUDCOMP$subjid",
    "Raw_STUDCOMP$compyn"
   ]
  },
  "kri0007": {
   "id": "kri0007",
   "abbr": "TDSC",
   "metric": "Treatment Discontinuation Rate",
   "level": "Site",
   "needs": [
    "Raw_SDRGCOMP",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_SDRGCOMP$subjid",
    "Raw_SDRGCOMP$sdrgyn",
    "Raw_SDRGCOMP$phase"
   ]
  },
  "kri0008": {
   "id": "kri0008",
   "abbr": "QRY",
   "metric": "Query Rate",
   "level": "Site",
   "needs": [
    "Raw_DATACHG",
    "Raw_QUERY",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_QUERY$querystatus",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid"
   ]
  },
  "kri0009": {
   "id": "kri0009",
   "abbr": "OQRY",
   "metric": "Delayed Query Resolution Rate",
   "level": "Site",
   "needs": [
    "Raw_QUERY",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_QUERY$querystatus",
    "Raw_QUERY$queryage"
   ]
  },
  "kri0010": {
   "id": "kri0010",
   "abbr": "ODAT",
   "metric": "Delayed Data Entry Rate",
   "level": "Site",
   "needs": [
    "Raw_DATAENT",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_DATAENT$data_entry_lag"
   ]
  },
  "kri0011": {
   "id": "kri0011",
   "abbr": "CDAT",
   "metric": "Data Change Rate",
   "level": "Site",
   "needs": [
    "Raw_DATACHG",
    "Raw_SUBJ"
   ],
   "needsCols": [
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$invid",
    "Raw_DATACHG$n_changes"
   ]
  },
  "kri0012": {
   "id": "kri0012",
   "abbr": "SF",
   "metric": "Screen Failure Rate",
   "level": "Site",
   "needs": [
    "Raw_ENROLL"
   ],
   "needsCols": [
    "Raw_ENROLL$subjectid",
    "Raw_ENROLL$invid",
    "Raw_ENROLL$enrollyn"
   ]
  },
  "srs0001": {
   "id": "srs0001",
   "abbr": "SRS",
   "metric": "Site Risk Score",
   "level": "Site",
   "needs": [],
   "needsCols": [
    "Raw_AE$aeser",
    "Raw_AE$subjid",
    "Raw_DATACHG$n_changes",
    "Raw_DATAENT$data_entry_lag",
    "Raw_ENROLL$enrollyn",
    "Raw_ENROLL$invid",
    "Raw_ENROLL$subjectid",
    "Raw_LB$subjid",
    "Raw_LB$toxgrg_nsv",
    "Raw_PD$deemedimportant",
    "Raw_PD$subjid",
    "Raw_QUERY$queryage",
    "Raw_QUERY$querystatus",
    "Raw_SDRGCOMP$phase",
    "Raw_SDRGCOMP$sdrgyn",
    "Raw_SDRGCOMP$subjid",
    "Raw_STUDCOMP$compyn",
    "Raw_STUDCOMP$subjid",
    "Raw_SUBJ$invid",
    "Raw_SUBJ$subjid",
    "Raw_SUBJ$timeonstudy"
   ],
   "derived": true,
   "derivedFrom": [
    "kri0001",
    "kri0002",
    "kri0003",
    "kri0004",
    "kri0005",
    "kri0006",
    "kri0007",
    "kri0008",
    "kri0009",
    "kri0010",
    "kri0011",
    "kri0012"
   ]
  }
 },
 "userExport": {
  "Raw_SUBJ": [
   "STUDYID",
   "USUBJID",
   "CENTRE_CODE",
   "CNTRY",
   "SUBJ_LABEL",
   "ENROLLED",
   "DAYS_ON_STUDY",
   "FPFV",
   "TRTSDT",
   "DAYS_EXPOSED",
   "AGE",
   "SEX",
   "RACE",
   "REC_CREATED",
   "ARM",
   "ACTARM",
   "DATAPAGEID"
  ],
  "Raw_AE": [
   "STUDYID",
   "USUBJID",
   "SAE_YN",
   "ONSET_DATE",
   "RESOLUTION_DATE",
   "MEDDRA_PT",
   "MEDDRA_SOC",
   "CTCAE_GRADE",
   "CAUSALITY",
   "REC_CREATED",
   "AEACN",
   "AEOUT",
   "DATAPAGEID"
  ],
  "Raw_LB": [
   "STUDYID",
   "USUBJID",
   "LBTEST",
   "LBSTRESN",
   "LBSTRESU",
   "LAB_GRADE",
   "VISIT",
   "VISITNUM",
   "LBNRIND"
  ],
  "Raw_PD": [
   "STUDYID",
   "USUBJID",
   "PD_CATEGORY",
   "PD_CODE",
   "PD_TERM",
   "PD_DATE",
   "PD_SEVERITY",
   "DATAPAGEID"
  ],
  "Raw_ENROLL": [
   "STUDYID",
   "USUBJID",
   "CENTRE_CODE",
   "ENROLL_DT",
   "ENROLLED",
   "SCRN_DT",
   "REC_CREATED",
   "DATAPAGEID"
  ],
  "Raw_STUDCOMP": [
   "STUDYID",
   "USUBJID",
   "COMPLETION_STATUS",
   "COMP_DT",
   "REASON",
   "REC_CREATED"
  ],
  "Raw_SDRGCOMP": [
   "STUDYID",
   "USUBJID",
   "DRUG_COMP_STATUS",
   "DRUG_COMP_DT",
   "REASON_DISC"
  ],
  "Raw_SITE": [
   "PROTOCOL",
   "SITE_NUMBER",
   "PI_FIRST",
   "PI_LAST",
   "SITE_STATUS",
   "CITY",
   "STATE",
   "CNTRY",
   "ACTIVATION_DT"
  ],
  "Raw_STUDY": [
   "PROTOCOL",
   "STUDY_TITLE",
   "PHASE",
   "SPONSOR",
   "THERAPEUTIC_AREA",
   "INDICATION",
   "STATUS",
   "PLANNED_N",
   "FIRST_SUBJ_IN",
   "LAST_SUBJ_OUT"
  ],
  "Raw_DATAENT": [
   "STUDYID",
   "SUBJ_LABEL",
   "ENTRY_LAG",
   "VISIT_DATE",
   "FORM",
   "DATAPAGEID"
  ],
  "Raw_PK": [
   "STUDYID",
   "USUBJID",
   "VISIT",
   "PCTEST",
   "PCSTRESN",
   "PCDTC"
  ]
 },
 "notDelivered": [
  "Raw_DATACHG",
  "Raw_QUERY"
 ],
 "metricCriticalCols": [
  "Raw_AE$aeser",
  "Raw_AE$subjid",
  "Raw_DATACHG$n_changes",
  "Raw_DATAENT$data_entry_lag",
  "Raw_ENROLL$country",
  "Raw_ENROLL$enrollyn",
  "Raw_ENROLL$invid",
  "Raw_ENROLL$subjectid",
  "Raw_LB$subjid",
  "Raw_LB$toxgrg_nsv",
  "Raw_PD$deemedimportant",
  "Raw_PD$subjid",
  "Raw_QUERY$queryage",
  "Raw_QUERY$querystatus",
  "Raw_SDRGCOMP$phase",
  "Raw_SDRGCOMP$sdrgyn",
  "Raw_SDRGCOMP$subjid",
  "Raw_STUDCOMP$compyn",
  "Raw_STUDCOMP$subjid",
  "Raw_SUBJ$country",
  "Raw_SUBJ$invid",
  "Raw_SUBJ$subjid",
  "Raw_SUBJ$timeonstudy"
 ],
 "n_critical": 23
};
